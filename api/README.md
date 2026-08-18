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

`GET /api/listings/mine` in `src/index.js` is the reference implementation —
copy this shape for every new protected route in later epics.

## Local development

```
cp .env.example .env   # fill in once a Cognito pool / database exist
npm install
npm run dev
```

## Testing

`npm test` runs a smoke test only (confirms the app wires up without a live
database or Cognito pool). Real request/response tests land with the
listings & search epic once there's a database to run them against.
