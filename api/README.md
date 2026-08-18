# SellSmart Property API

Node/Express service. Container image for the ECS Fargate task defined in
`terraform/modules/compute` — the Dockerfile here replaces the placeholder
`app_image` in `terraform/environments/stage0.tfvars` once a real AWS
account/ECR repo exists.

## The auth/RBAC pattern (issue #4)

Every protected route follows this shape:

1. `requireAuth` (`src/middleware/auth.js`) verifies the Cognito access
   token against the pool's public keys — no secret to manage, no network
   call to Cognito per request.
2. `requireRole(...)` checks the token's `cognito:groups` claim against
   the roles allowed to *attempt* the action.
3. `withUserContext` (`src/db/pool.js`) sets two Postgres session
   variables from the verified token before running any query, so
   **Row-Level Security enforces the real access control** — see
   `db/migrations/0003_listings_rls.sql`. Step 2 is a fast-fail UX
   improvement; step 3 is what actually protects the data even if a future
   bug lets a bad request past the middleware.

`src/routes/listings.js` (issue #5) is the fullest example — public
browse/search/detail routes plus seller-owned create/update/delete, all
built on the same pattern. `src/routes/enquiries.js` and
`src/routes/viewings.js` (issue #6) add the public-insert / seller-reads-own
variant: an unauthenticated POST that looks the owning seller up
server-side rather than trusting it from the request body, backed by a
`WITH CHECK` in `db/migrations/0008_enquiries_viewings_rls.sql` that
verifies it anyway. Their POST handlers also don't use `RETURNING` — see
the gotcha noted in `db/README.md` — an anonymous INSERT can't read its own
row back that way, since RETURNING is filtered through the table's SELECT
policies and there isn't one that grants an anonymous request visibility.

`src/routes/otps.js` (issue #7) adds a third variant for buyers who need
*ongoing* access to a single row across several requests (submit an offer,
later accept a counter, later sign) without an account. Rather than a
session var tied to the (nonexistent) buyer identity, `withOtpAccess`
(`src/db/pool.js`) sets a `'otp_bearer'` role plus the specific OTP id from
the URL — knowing that unguessable uuid *is* the buyer's credential. Every
`otp_bearer` RLS policy pins to that exact id, never `USING (true)`, so a
future bug elsewhere can't turn "I know my own OTP's id" into "I can read
everyone's" — see `db/migrations/0010_otps_rls.sql`.

`src/routes/documents.js` (issue #8) reuses the `otp_bearer` capability
unchanged for the buyer side (a document belongs to an OTP transaction, so
"knows the OTP id" is still the right boundary) plus the normal seller
pattern. Uploads never stream through this API: `src/lib/s3.js` wraps the
S3 client, and routes only ever hand back a presigned PUT URL (upload) or
presigned GET URLs (list) — the browser talks to S3 directly. `confirm`
verifies the object actually landed in S3 (`HeadObjectCommand`) before
writing the `documents` row, rather than trusting the client's say-so.

`src/routes/payments.js` (issue #9) is different from every route above:
the writer that needs special handling isn't a buyer without an account,
it's PayFast's own server calling the ITN webhook with no Cognito token at
all. That's authenticated by recomputing PayFast's MD5 signature over the
payload (`src/lib/payfast.js`) rather than anything RLS can see — RLS then
adds a second, narrower layer on top via `withPaymentWebhookAccess`
(`src/db/pool.js`): once the signature's verified, it's scoped to the one
payment row the ITN's `m_payment_id` refers to, same "id is the
capability" pattern as `otp_bearer`. `db/migrations/0015` extends that
scope to the one listing that payment belongs to, so a completed payment
can flip it from draft to active.

`src/routes/docusign.js` (issue #10) replaces the previously-simulated Sign
OTP step with a real DocuSign envelope, and adds a *third* webhook
identifier shape: DocuSign Connect's completion webhook is authenticated
the same "no Cognito token, verify a signature instead" way as PayFast's
ITN, but the id it hands back (`envelopeId`) is one DocuSign generates when
the envelope is created, not one this API minted up front (contrast
`otps.id`/`payments.id`, which the API always controls). `withDocusignWebhookAccess`
(`src/db/pool.js`) scopes RLS by that id once it's known and stored on the
`otps` row — see `db/migrations/0016_otps_envelope.sql` /
`0017_otps_envelope_rls.sql`. Both parties are *embedded* signers
(`clientUserId` in `src/lib/docusign.js`'s `createEnvelope`), matching the
Signing Screen's "you never leave SellSmart Property" promise — no email
with a DocuSign-hosted link.

**Body-parsing gotcha found here:** the Connect webhook's HMAC signature
covers the *raw* request bytes, so it needs `express.raw()`, not
`express.json()` — but DocuSign sends `Content-Type: application/json`,
which the app-level `express.json()` in `index.js` would otherwise match
and consume first. `docusignWebhookRouter` is a separate router mounted
*before* `app.use(express.json())` specifically to avoid this (PayFast's
ITN webhook never hit this problem only because form-urlencoded's
different content-type doesn't match `express.json()`'s filter — that was
luck, not a pattern to rely on for a future JSON-body webhook).

`src/routes/providers.js` (issue #11) is the first table with a genuinely
unconditional `USING (true)` public SELECT policy
(`db/migrations/0019_providers_rls.sql`) -- it's SellSmart's own curated
business directory, not user-submitted or personal data, so there's no
equivalent of the anonymous-read leak risk every other epic had to design
around. Writes are `admin`-only, seeded via `db/migrations/0018_providers.sql`
so the directory has real content immediately rather than an empty table.
`src/routes/conveyancer.js`'s handoff route is a normal seller-authenticated
write with no new RLS of its own (reuses `0010`'s `seller_updates_own_otps`
unchanged) -- there's no webhook here, since a conveyancer's own updates
are "manual/email-driven for now" per MVP-SPEC.md, so this epic is simpler
than #9/#10's server-to-server callback shape. It does reuse `s3.js`'s
presigned-GET pattern from `documents.js`, but with a 7-day TTL instead of
5 minutes -- a human reads this email at their own pace, not a browser
fetching it immediately. `src/lib/email.js` wraps SES the same way `s3.js`
wraps S3.

`src/routes/admin.js` (issue #12) is mostly *not* new access control: the
`admin_full_access`-style policy each table already has
(`0003`/`0008`/`0010`/`0012`/`0014`) already let an admin cross seller
boundaries — this epic is largely about exposing routes over RLS that was
already there. The one genuinely new capability is user management, since
Cognito is the user store, not Postgres — `src/lib/cognito.js` wraps the
`Admin*` Cognito API calls (list/get users, group membership, enable/
disable) the same way `s3.js`/`email.js` wrap their services. The whole
router is gated once via `adminRouter.use(requireAuth, requireRole("admin"))`
rather than repeating both on every route — the only route file that does
this, since every earlier one mixed public/seller/buyer routes in the same
file and needed per-route control.

`src/lib/notify.js` (issue #13) is the transactional email layer —
enquiries, viewing requests, new offers, offer responses, document
uploads, and OTP signing all trigger one of its functions. Every one of
them is a **best-effort side effect that must never break the write that
triggered it**: `send()`/`sendToSeller()` catch and log their own errors
rather than let them propagate, and every call site in a route is
deliberately *not* awaited before the response is sent (the enquiry/
offer/etc. is already saved by that point; there's no reason to make the
caller wait on an email, and `notify.js` never rejects anyway, so nothing
is lost by not awaiting it). Sellers don't have a stored email in
Postgres — Cognito is the user store — so seller-facing notifications
resolve it via `lib/cognito.js`'s `getUser`, the same untestable-for-real
call the admin routes use. Buyer-facing ones use `otps.buyer_email`
(`db/migrations/0021`, added by this epic) or the email already stored on
`enquiries`/`viewing_requests`.

While wiring `notifyOtpSigned` into the DocuSign webhook, found and
removed two **dead but still-reachable routes**: `POST /otps/:id/sign` and
`POST /otps/mine/:id/sign` in `src/routes/otps.js` were the original
simulated-signing endpoints from issue #7, superseded by real DocuSign
envelopes in issue #10 -- but issue #10 added the new routes *alongside*
the old ones instead of removing them. Left in place, either one would
have let a party mark `signed_by_buyer`/`signed_by_seller` true with a
plain POST, bypassing DocuSign entirely.

Every route is wrapped in `src/middleware/asyncRoute.js`. Express 4 doesn't
catch a rejected promise from an async handler on its own — without the
wrapper, an error (like the RETURNING one above, before it was fixed) means
no response is ever sent and the client just hangs instead of getting the
500 from `index.js`'s error-handling middleware. Wrap every new route the
same way.

## Local development

```
cp .env.example .env   # fill in once a Cognito pool / database exist
npm install
npm run dev
```

Against a local Postgres (which typically has no SSL configured, unlike
Aurora), apply migrations with:

```
DATABASE_URL=postgres://user:pass@localhost:5432/sellsmart DATABASE_SSL=false node scripts/migrate.js
```

## Testing

`npm test` runs everything under `src/`:

- `src/index.test.js` is a smoke test only (confirms the app wires up, no
  database or Cognito pool needed).
- Everything else under `src/routes/` (`*.test.js` and `*.http.test.js`) is
  real request/response and RLS tests and needs a live `DATABASE_URL` with
  migrations applied (see `scripts/migrate.js` and the `api-test` CI job for
  how to set one up locally). There's no way to get a real Cognito token
  without an AWS account, so these call `withUserContext` directly with the
  same shape of user object `requireAuth` attaches — that's the actual
  security boundary (RLS), not the JWT verification step.
- `src/routes/documents.http.test.js` additionally needs a real
  S3-compatible endpoint (`S3_ENDPOINT` + `DOCUMENTS_BUCKET`) -- CI points
  this at a [LocalStack](https://localstack.cloud) service container (see
  `.github/workflows/ci.yml`); run one locally the same way
  (`docker run -p 4566:4566 localstack/localstack`, then
  `aws --endpoint-url=http://localhost:4566 s3 mb s3://<bucket>` and set
  `S3_ENDPOINT=http://localhost:4566` + matching `AWS_ACCESS_KEY_ID` /
  `AWS_SECRET_ACCESS_KEY` — any values work, LocalStack doesn't check them).
- `src/lib/payfast.test.js` is pure unit tests (no DB, no network) for the
  signature algorithm — the one part of the PayFast integration verifiable
  byte-for-byte without a real merchant account.
  `src/routes/payments.http.test.js` exercises the full ITN webhook over
  HTTP by computing a valid signature with that same function and posting
  a form-encoded payload, same as PayFast would — no live PayFast sandbox
  call involved (there's no self-hostable emulator for it, unlike
  Postgres/S3), so the seller-initiated checkout side is only tested at
  the RLS layer (`payments.test.js`), matching every other
  can't-get-a-real-token route in this API.
- `src/lib/docusign.test.js` (issue #10) is the same pattern again for
  DocuSign Connect's HMAC signature. `src/routes/docusign.http.test.js`
  exercises the webhook fully over HTTP the same way `payments.http.test.js`
  does; the JWT Grant/envelope/recipient-view calls in `src/lib/docusign.js`
  are implemented against DocuSign's documented REST API but, like Cognito
  token verification, are never exercised for real in CI — no DocuSign
  account of any kind exists yet.
- `src/lib/email.test.js` (issue #11) sends a real email through
  LocalStack's SES emulation and reads it back via LocalStack's `/_aws/ses`
  inspection endpoint — worth exercising the actual send, same bar as
  `s3.js`'s tests, rather than mocking the SDK call. LocalStack's SES still
  enforces sender verification, so the `EMAIL_FROM` address needs
  `aws --endpoint-url=http://localhost:4566 ses verify-email-identity --email-address <address>`
  once per LocalStack instance before this test can pass (CI does this;
  do the same locally). `src/routes/conveyancer.js`'s
  handoff route needs a real seller Cognito token to test past
  `requireAuth`, so — like the checkout/envelope-creation routes in #9/#10
  — it only has a "requires auth" HTTP check; it introduces no RLS of its
  own to test at that layer either (see `db/migrations/0020`'s comment).
- `src/lib/cognito.js` (issue #12) was going to get the same LocalStack
  integration test treatment as `s3.js`/`email.js`, but LocalStack's
  `cognito-idp` emulation turned out to be Pro-only too (same class of
  limitation as `sesv2` -- confirmed by trying it in CI and getting
  "not yet implemented or pro feature"). It's implemented against
  Cognito's documented Admin* API but untested against any real or
  emulated infra -- the same bucket sign-in JWT verification
  (`middleware/auth.js`) has always been in. `src/routes/admin.js`'s
  DB routes (listings/payments/documents oversight) are RLS-tested
  (`admin.test.js`) instead, same as every other admin-gated route; all of
  its routes (Cognito-backed or not) get an HTTP "requires auth" check
  (`admin.http.test.js`), same reasoning as `requireRole`'s 403 branch
  never being reachable without a real signed-in role either.
- `src/lib/notify.test.js` (issue #13) splits along the same line
  `notify.js` itself does: its buyer-facing paths (an email address it
  already has) are tested for real through LocalStack's SES emulation,
  same as `email.test.js`. Its seller-facing paths call `lib/cognito.js`'s
  `getUser`, which can't succeed in this environment -- what's verified
  there instead is the actual guarantee that matters, that a failed/
  impossible Cognito lookup never makes these functions throw (every one
  is a best-effort side effect of an already-successful write). Because
  each of those calls is a real rejected round trip to Cognito with no
  local emulation available, that test runs them with `Promise.all`
  rather than sequential awaits, to stay well inside node:test's
  per-test timeout — see `lib/cognito.js`'s `NodeHttpHandler` timeout
  comment for why a single one fails fast rather than hanging.
