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
