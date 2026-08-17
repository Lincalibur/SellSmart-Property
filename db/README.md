# Database migrations

Plain, ordered SQL files, run in filename order. No ORM/migration tool
chosen yet — deliberately, since there's no real database to run them
against until an AWS account exists (see `terraform/README.md`). Revisit
once the listings & search epic (#5) needs real migration tooling
(`node-pg-migrate` or similar) for repeatable up/down migrations.

`0003_listings_rls.sql` is the reference pattern every future table's access
control should follow: a policy per role, driven by the two session
variables `api/src/db/pool.js` sets from the verified Cognito token on every
request.
