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
