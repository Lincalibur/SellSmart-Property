-- Unlike every other table so far, this one really is fine with an
-- unconditional public SELECT: it's SellSmart's own curated business
-- directory (name/category/location/blurb), not user-submitted or
-- personal data -- there's no equivalent of a buyer's ID number or a
-- seller's private listing here to leak. Writes are admin-only (no
-- self-service provider signup in this epic; issue #12 is the admin
-- panel that will actually manage this).
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers FORCE ROW LEVEL SECURITY;

CREATE POLICY public_reads_providers ON providers
  FOR SELECT
  USING (true);

CREATE POLICY admin_manages_providers ON providers
  FOR ALL
  USING (current_setting('app.current_user_role', true) = 'admin')
  WITH CHECK (current_setting('app.current_user_role', true) = 'admin');
