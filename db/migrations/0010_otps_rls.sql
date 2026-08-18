-- Same reference pattern as the rest of db/migrations, plus the
-- "otp_bearer" capability role api/src/db/pool.js's withOtpAccess sets:
-- knowing an OTP's uuid (which the buyer got back from their own POST) is
-- what proves it's theirs, since buyers don't have accounts yet. Every
-- otp_bearer policy pins to id = current_otp_id (a session var the API sets
-- from the URL param it already validated), never USING (true) -- so even
-- a future bug that ran an unfiltered query couldn't leak every buyer's
-- name/ID number/contact details to an anonymous request.
ALTER TABLE otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE otps FORCE ROW LEVEL SECURITY;

ALTER TABLE otp_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_history FORCE ROW LEVEL SECURITY;

-- Submit Offer (OTP Builder) -- same cross-check pattern as 0008's
-- public_creates_enquiry: the API looks seller_id up server-side, this is
-- the backstop if that ever regresses. Also requires the caller to already
-- know the id it's about to insert (the API generates it before calling
-- withOtpAccess), so this can't be used to insert as a different id later.
CREATE POLICY otp_bearer_creates_otp ON otps
  FOR INSERT
  WITH CHECK (
    current_setting('app.current_user_role', true) = 'otp_bearer'
    AND id::text = current_setting('app.current_otp_id', true)
    AND seller_id = (SELECT seller_id FROM listings WHERE id = listing_id)
    AND (SELECT status FROM listings WHERE id = listing_id) = 'active'
  );

-- Buyer polling their own OTP's status, and Buyer Accept Counter / Sign OTP
-- (buyer side) below need to read and update it afterward.
CREATE POLICY otp_bearer_reads_own_otp ON otps
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) = 'otp_bearer'
    AND id::text = current_setting('app.current_otp_id', true)
  );

CREATE POLICY otp_bearer_updates_own_otp ON otps
  FOR UPDATE
  USING (
    current_setting('app.current_user_role', true) = 'otp_bearer'
    AND id::text = current_setting('app.current_otp_id', true)
  )
  WITH CHECK (
    current_setting('app.current_user_role', true) = 'otp_bearer'
    AND id::text = current_setting('app.current_otp_id', true)
  );

-- Offer Management dashboard -- Accept / Counter / Reject, Sign OTP
-- (seller side).
CREATE POLICY seller_reads_own_otps ON otps
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) = 'seller'
    AND seller_id = current_setting('app.current_user_id', true)
  );

CREATE POLICY seller_updates_own_otps ON otps
  FOR UPDATE
  USING (
    current_setting('app.current_user_role', true) = 'seller'
    AND seller_id = current_setting('app.current_user_id', true)
  )
  WITH CHECK (
    current_setting('app.current_user_role', true) = 'seller'
    AND seller_id = current_setting('app.current_user_id', true)
  );

CREATE POLICY admin_full_access_otps ON otps
  FOR ALL
  USING (current_setting('app.current_user_role', true) = 'admin')
  WITH CHECK (current_setting('app.current_user_role', true) = 'admin');

-- otp_history: same seller/otp_bearer split, cross-checked against the
-- parent otp's real seller_id the same way otps cross-checks listings'.
CREATE POLICY otp_bearer_creates_history ON otp_history
  FOR INSERT
  WITH CHECK (
    current_setting('app.current_user_role', true) = 'otp_bearer'
    AND otp_id::text = current_setting('app.current_otp_id', true)
    AND seller_id = (SELECT seller_id FROM otps WHERE id = otp_id)
  );

CREATE POLICY otp_bearer_reads_own_history ON otp_history
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) = 'otp_bearer'
    AND otp_id::text = current_setting('app.current_otp_id', true)
  );

CREATE POLICY seller_reads_own_history ON otp_history
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) = 'seller'
    AND seller_id = current_setting('app.current_user_id', true)
  );

CREATE POLICY seller_creates_history ON otp_history
  FOR INSERT
  WITH CHECK (
    current_setting('app.current_user_role', true) = 'seller'
    AND seller_id = current_setting('app.current_user_id', true)
  );

CREATE POLICY admin_full_access_otp_history ON otp_history
  FOR ALL
  USING (current_setting('app.current_user_role', true) = 'admin')
  WITH CHECK (current_setting('app.current_user_role', true) = 'admin');
