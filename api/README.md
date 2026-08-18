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
built on the same pattern.

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
- `src/routes/listings.test.js` and `listings.http.test.js` are real
  request/response and RLS tests and need a live `DATABASE_URL` with
  migrations applied (see `scripts/migrate.js` and the `api-test` CI job for
  how to set one up locally). There's no way to get a real Cognito token
  without an AWS account, so these call `withUserContext` directly with the
  same shape of user object `requireAuth` attaches — that's the actual
  security boundary (RLS), not the JWT verification step.
