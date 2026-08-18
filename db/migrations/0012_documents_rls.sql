-- Same otp_bearer / seller split as db/migrations/0010, reused unchanged:
-- a document belongs to an OTP (transaction), so "knows the OTP id" /
-- "owns the listing behind it" is exactly the right access boundary here
-- too -- no new capability role needed, just the same app.current_otp_id
-- session var withOtpAccess already sets.
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;

CREATE POLICY otp_bearer_creates_document ON documents
  FOR INSERT
  WITH CHECK (
    current_setting('app.current_user_role', true) = 'otp_bearer'
    AND otp_id::text = current_setting('app.current_otp_id', true)
    AND seller_id = (SELECT seller_id FROM otps WHERE id = otp_id)
  );

CREATE POLICY otp_bearer_reads_own_documents ON documents
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) = 'otp_bearer'
    AND otp_id::text = current_setting('app.current_otp_id', true)
  );

-- Re-uploading a doc_type replaces its row (ON CONFLICT DO UPDATE in the
-- API) -- covers both parties, since either can be the one re-uploading.
CREATE POLICY otp_bearer_updates_own_documents ON documents
  FOR UPDATE
  USING (
    current_setting('app.current_user_role', true) = 'otp_bearer'
    AND otp_id::text = current_setting('app.current_otp_id', true)
  )
  WITH CHECK (
    current_setting('app.current_user_role', true) = 'otp_bearer'
    AND otp_id::text = current_setting('app.current_otp_id', true)
  );

CREATE POLICY seller_creates_document ON documents
  FOR INSERT
  WITH CHECK (
    current_setting('app.current_user_role', true) = 'seller'
    AND seller_id = current_setting('app.current_user_id', true)
  );

CREATE POLICY seller_reads_own_documents ON documents
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) = 'seller'
    AND seller_id = current_setting('app.current_user_id', true)
  );

CREATE POLICY seller_updates_own_documents ON documents
  FOR UPDATE
  USING (
    current_setting('app.current_user_role', true) = 'seller'
    AND seller_id = current_setting('app.current_user_id', true)
  )
  WITH CHECK (
    current_setting('app.current_user_role', true) = 'seller'
    AND seller_id = current_setting('app.current_user_id', true)
  );

CREATE POLICY admin_full_access_documents ON documents
  FOR ALL
  USING (current_setting('app.current_user_role', true) = 'admin')
  WITH CHECK (current_setting('app.current_user_role', true) = 'admin');
