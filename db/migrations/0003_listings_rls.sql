-- Reference RLS pattern for the whole backend: the API's role check in
-- middleware (api/src/middleware/auth.js) decides whether a request is
-- allowed to *attempt* an action; these policies are the real access
-- control, enforced by Postgres itself even if a future bug lets a bad
-- request through the middleware. api/src/db/pool.js sets the two session
-- variables these policies read on every request.

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- Sellers see and manage only their own listings.
CREATE POLICY seller_owns_listing ON listings
  FOR ALL
  USING (
    current_setting('app.current_user_role', true) = 'seller'
    AND seller_id = current_setting('app.current_user_id', true)
  )
  WITH CHECK (
    current_setting('app.current_user_role', true) = 'seller'
    AND seller_id = current_setting('app.current_user_id', true)
  );

-- Buyers can read any listing that's actually on the market.
CREATE POLICY buyer_reads_active_listings ON listings
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) = 'buyer'
    AND status = 'active'
  );

-- Admins can read and manage everything -- MFA enforced at sign-in
-- (terraform/modules/auth), not re-checked here.
CREATE POLICY admin_full_access ON listings
  FOR ALL
  USING (current_setting('app.current_user_role', true) = 'admin')
  WITH CHECK (current_setting('app.current_user_role', true) = 'admin');
