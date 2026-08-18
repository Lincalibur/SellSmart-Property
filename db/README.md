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
