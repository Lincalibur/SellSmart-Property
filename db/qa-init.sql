-- Mounted into the bundled QA Postgres container's
-- /docker-entrypoint-initdb.d/ (docker-compose.yml), run automatically on
-- first container start against POSTGRES_DB. Same reasoning as
-- .github/workflows/ci.yml's app_test role: a superuser bypasses RLS
-- entirely (see db/migrations/0006_listings_force_rls.sql), and QA should
-- exercise the real access-control layer, not silently skip it, the same
-- way production's Aurora master user isn't a superuser either.
CREATE ROLE app_qa LOGIN PASSWORD 'app_qa';
ALTER DATABASE sellsmart OWNER TO app_qa;
GRANT ALL ON SCHEMA public TO app_qa;
