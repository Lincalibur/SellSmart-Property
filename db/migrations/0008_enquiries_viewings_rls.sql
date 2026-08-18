-- Same reference pattern as db/migrations/0003 + 0005 + 0006: a policy per
-- role, driven by the two session variables api/src/db/pool.js sets, with
-- FORCE so the table-owning connection (see 0006's comment -- no separate
-- low-privilege app role exists yet) doesn't silently bypass these.
ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiries FORCE ROW LEVEL SECURITY;

ALTER TABLE viewing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE viewing_requests FORCE ROW LEVEL SECURITY;

-- Send Enquiry / Request Viewing (MVP-SPEC.md #6) are unauthenticated --
-- a buyer doesn't have an account at this point in the flow. The WITH
-- CHECK subquery is what actually keeps seller_id honest: even though the
-- API route looks it up server-side rather than trusting the request body,
-- this is the real backstop if a future bug ever lets a bad value through.
CREATE POLICY public_creates_enquiry ON enquiries
  FOR INSERT
  WITH CHECK (
    seller_id = (SELECT seller_id FROM listings WHERE id = listing_id)
    AND (SELECT status FROM listings WHERE id = listing_id) = 'active'
  );

CREATE POLICY public_creates_viewing_request ON viewing_requests
  FOR INSERT
  WITH CHECK (
    seller_id = (SELECT seller_id FROM listings WHERE id = listing_id)
    AND (SELECT status FROM listings WHERE id = listing_id) = 'active'
  );

-- Enquiries Inbox is read-only -- sellers see only their own.
CREATE POLICY seller_reads_own_enquiries ON enquiries
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) = 'seller'
    AND seller_id = current_setting('app.current_user_id', true)
  );

-- Viewing Requests: sellers read their own and update status/reschedule
-- (Accept / Suggest New Time), but never touch another seller's rows.
CREATE POLICY seller_reads_own_viewing_requests ON viewing_requests
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) = 'seller'
    AND seller_id = current_setting('app.current_user_id', true)
  );

CREATE POLICY seller_updates_own_viewing_requests ON viewing_requests
  FOR UPDATE
  USING (
    current_setting('app.current_user_role', true) = 'seller'
    AND seller_id = current_setting('app.current_user_id', true)
  )
  WITH CHECK (
    current_setting('app.current_user_role', true) = 'seller'
    AND seller_id = current_setting('app.current_user_id', true)
  );

CREATE POLICY admin_full_access_enquiries ON enquiries
  FOR ALL
  USING (current_setting('app.current_user_role', true) = 'admin')
  WITH CHECK (current_setting('app.current_user_role', true) = 'admin');

CREATE POLICY admin_full_access_viewing_requests ON viewing_requests
  FOR ALL
  USING (current_setting('app.current_user_role', true) = 'admin')
  WITH CHECK (current_setting('app.current_user_role', true) = 'admin');
