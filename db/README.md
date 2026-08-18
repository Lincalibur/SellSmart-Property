# Database migrations

Plain, ordered SQL files, run in filename order via `api/scripts/migrate.js`
(no ORM/migration tool chosen yet — deliberately, since there's still no
real AWS account/Aurora instance; revisit once that changes and repeatable
up/down migrations are worth the extra tooling).

`0003_listings_rls.sql` is the reference pattern every future table's access
control should follow: a policy per role, driven by the two session
variables `api/src/db/pool.js` sets from the verified Cognito token on every
request. `0005_listings_public_read.sql` adds the unauthenticated-read
variant needed for public browse/search pages. `0006_listings_force_rls.sql`
is important context for both: Postgres exempts a table's *owner* from RLS
by default, and until a separate low-privilege app role is provisioned
(no such role exists in `terraform/modules/database` yet), the API connects
as the owner of every table it migrates — `FORCE ROW LEVEL SECURITY` is what
actually makes the policies bind in that setup. Apply the same
owner-connects-as-itself assumption (and the same FORCE) to any new table
until that changes.

`0007_enquiries_viewings.sql` / `0008_enquiries_viewings_rls.sql` (issue #6)
add a variant of the pattern for unauthenticated writes: buyers submitting
an enquiry or viewing request don't have an account, so the INSERT policy
can't check `current_setting('app.current_user_id')` against anything. It
instead cross-checks the submitted `seller_id` against the listing's actual
`seller_id` (and that the listing is `active`) via a `WITH CHECK` subquery
— the API route looks the seller up server-side rather than trusting the
request body, but this is the real backstop if that ever regresses.

**Gotcha found building this:** an `INSERT ... RETURNING` is filtered
through the table's *SELECT* policies too, not just the INSERT policy's
`WITH CHECK`. An anonymous request has no SELECT policy granting it
visibility into enquiries/viewing_requests (only the owning seller or an
admin can read them), so `RETURNING` on these anonymous inserts fails with
"new row violates row-level security policy" even though the INSERT itself
is allowed. `api/src/routes/enquiries.js` and `viewings.js` work around
this by generating the id/timestamp in the API and building the response
from known values instead of reading the row back. Any future anonymous
INSERT route needs the same treatment; an authenticated INSERT is fine with
`RETURNING` as long as the actor has SELECT visibility of their own row
(e.g. sellers reading listings/viewing_requests they own).

`0009_otps.sql` / `0010_otps_rls.sql` (issue #7, OTP builder + offer
management) extend the unauthenticated-writer pattern to a buyer who needs
*repeat* access to one row across several requests (submit an offer, later
accept a counter, later sign) with still no account to key a session var
off. Instead of `current_setting('app.current_user_id')`, these policies
pin to `id = current_setting('app.current_otp_id')` — a session var
`withOtpAccess` (`api/src/db/pool.js`) sets from the id in the URL, which
the API already required the caller to know. Every `otp_bearer` policy uses
that exact-id check, never a bare `USING (true)`: with `true`, a future bug
that ran an unfiltered query anywhere would leak every buyer's name/ID
number/contact info to an anonymous request; with the exact-id check, the
same bug can only ever re-expose a row whose id the caller already had.
Setting `app.current_otp_id` to the id *before* the INSERT (rather than
generating it in the database) is also what lets `otps` use `RETURNING`
safely despite being written by an anonymous request — see the gotcha
above.

`0011_documents.sql` / `0012_documents_rls.sql` (issue #8, document hub)
reuse the `otp_bearer` role unchanged rather than inventing a new one: a
document belongs to an OTP (transaction), so "knows that OTP's id" is
already the right access boundary. `documents` is sparse -- a row only
exists once something has actually been uploaded to S3 (see
`api/src/routes/documents.js`); "pending" is just the absence of a row for
that `doc_type`, computed by the frontend.

`0013_payments.sql` / `0014_payments_rls.sql` / `0015_listings_payfast_activation.sql`
(issue #9, payments) add the mirror-image case: it's the *seller* who
writes normally (`seller_creates_own_payment`, same seller-owns-it shape
as `listings`), but PayFast's ITN webhook then writes back with no Cognito
token at all -- authenticated by verifying PayFast's signature
(`api/src/lib/payfast.js`), not anything RLS can see. Rather than a role
that can update any payment, `withPaymentWebhookAccess`
(`api/src/db/pool.js`) sets `app.current_payment_id` from the ITN's
`m_payment_id` (a uuid *this API* generated and gave to PayFast at
checkout), and `0014`'s policy pins to that exact row -- the same
"id is the capability, never `USING (true)`" pattern as `otp_bearer`.
`0015` extends that same scoped capability across tables: once verified
for one payment, it can also flip *that payment's own* `listing_id` from
draft to active, via a second explicit session var
(`app.current_activatable_listing_id`, set once the API already knows the
value from the payments row it just read).

**Real gotcha found here, confirmed with `EXPLAIN` in CI:** an UPDATE (or
DELETE) policy alone is not sufficient -- Postgres also requires the row to
satisfy the table's *SELECT*-applicable policies, the same way `RETURNING`
does (see the gotcha above). `0015` originally added only an UPDATE policy
for `payfast_webhook` on `listings`; it consistently matched zero rows even
though the UPDATE policy's own condition checked out correctly in
isolation, because no SELECT policy granted that role visibility of a
still-draft listing (`public_reads_active_listings` only covers `active`
ones). The fix was adding a matching `payfast_webhook_reads_activatable_listing`
SELECT policy alongside the UPDATE one. Apply the same check to any future
UPDATE/DELETE-only policy on a table: does *some* SELECT policy also cover
that role for the rows it needs to target?

`0016_otps_envelope.sql` / `0017_otps_envelope_rls.sql` (issue #10,
e-signature) replace the simulated Sign OTP step with a real DocuSign
envelope, and introduce a `docusign_webhook` role -- same "id is the
capability" shape as `payfast_webhook`, but keyed on `envelope_id`
(`UNIQUE`, since it's looked up *by* value) rather than a uuid this API
minted itself, because DocuSign is the one that generates it, only handed
back once the envelope is created. `0017` applies `0015`'s lesson from the
start: the UPDATE policy on `otps` and its matching SELECT policy are
added together, and the `otp_history` INSERT's `WITH CHECK` subquery back
to `otps` works because that SELECT policy already grants visibility for
it (the same reason `0014`'s `payfast_webhook_reads_own_payment` was
needed for its own INSERT-subquery cross-checks) -- confirms the earlier
"cross-table subquery" red herring from `0015`'s development was never the
real problem; the missing SELECT policy always was.

`0018_providers.sql` / `0019_providers_rls.sql` (issue #11, marketplace)
break the pattern in a different direction: `providers` is SellSmart's own
curated business directory (name/category/location/blurb), not
user-submitted or personal data, so `public_reads_providers` really is a
bare `USING (true)` -- the first table in this schema where that's actually
safe, rather than the deliberately-narrower "id is the capability" shape
everything else uses. `0018` also seeds the same catalog `src/data/seed.js`
already has (with `.example`-TLD emails -- these are mockup businesses, not
real companies, and must never be emailable until real providers are
onboarded), so the directory has real content from the first migration run
instead of an empty table. `0020_otps_conveyancer.sql` adds the handoff
columns to `otps` but no new RLS at all: the existing `seller_updates_own_otps`
policy (`0010`) already covers writing them, since there's no webhook actor
here -- a conveyancer's own updates are manual/email-driven for now
(MVP-SPEC.md), unlike payments (#9) or e-signature (#10).

Issue #12 (admin panel) needed **no new migration at all**. Every table
that matters to a back office already had an `admin_full_access`-style
`FOR ALL` policy from the epic that created it (`0003` for listings,
`0008` for enquiries/viewing_requests, `0010` for otps/otp_history, `0012`
for documents, `0014` for payments) -- this was deliberate from the start
(see each of those tables' comments), not something added retroactively.
`api/src/routes/admin.js` is proof that pattern paid off: pure
route-layer work over RLS that was already correct. Users aren't a table
in this database at all -- Cognito is the store -- so "manage users" is
the one part of this epic with no RLS angle whatsoever;
`api/src/lib/cognito.js` calls Cognito's own Admin* APIs directly.

`0021_otps_buyer_email.sql` (issue #13, notifications) is a small but
overdue fix: `otps` never stored a buyer email, because `buyer_contact`
(issue #7) is a phone number, and issue #10's DocuSign envelope route
worked around the gap by requiring `buyerEmail` in its own request body
instead. "Update on your offer" (an email to the buyer) needs a real
column to read from, so this adds one and removes that workaround --
see `api/src/routes/docusign.js`'s updated envelope/signing-url routes,
which now resolve both parties' email server-side (this column for the
buyer, `lib/cognito.js` for the seller) instead of trusting either from
a request. No RLS change needed: it's just a new column on a table whose
existing policies already cover writing it.
