-- Postgres exempts a table's OWNER from its own RLS policies by default.
-- No separate low-privilege app role is provisioned yet (terraform/modules/
-- database only creates the master credential -- see db/README.md), so the
-- API connects as the owner of every table it migrates. Without FORCE, that
-- means requireAuth/requireRole would be the *only* access control in
-- practice, which is exactly the "one bug away from a leak" scenario
-- db/migrations/0003_listings_rls.sql's comment warns about. AWS RDS/Aurora
-- master users are not granted BYPASSRLS, so FORCE is sufficient here (a
-- real Postgres superuser would still bypass it regardless).
ALTER TABLE listings FORCE ROW LEVEL SECURITY;
