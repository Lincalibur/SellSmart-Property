-- Epic #14: Compliance hardening. FICA requires a minimum 5-year retention
-- for transaction/FICA records, and legal-hold/WORM on signed OTPs and
-- title documents (docs/Infrastructure-Hosting-Plan.md #4). S3 Object Lock
-- already WORM-protects uploaded documents at the storage layer
-- (terraform/modules/storage), but the FOR ALL admin_full_access policy on
-- these four tables still let admin DELETE the rows themselves before
-- their retention window. Replace each with separate SELECT/INSERT/UPDATE
-- policies (same USING/WITH CHECK condition, just no DELETE grant) --
-- under FORCE RLS this blocks deletion entirely, for every role including
-- admin, same immutability mechanism as db/migrations/0022's audit_log.
--
-- listings is untouched -- no retention requirement applies to a listing
-- itself, only to the transaction/FICA records referencing it.

DROP POLICY admin_full_access_otps ON otps;
CREATE POLICY admin_reads_otps ON otps
  FOR SELECT
  USING (current_setting('app.current_user_role', true) = 'admin');
CREATE POLICY admin_creates_otps ON otps
  FOR INSERT
  WITH CHECK (current_setting('app.current_user_role', true) = 'admin');
CREATE POLICY admin_updates_otps ON otps
  FOR UPDATE
  USING (current_setting('app.current_user_role', true) = 'admin')
  WITH CHECK (current_setting('app.current_user_role', true) = 'admin');

DROP POLICY admin_full_access_otp_history ON otp_history;
CREATE POLICY admin_reads_otp_history ON otp_history
  FOR SELECT
  USING (current_setting('app.current_user_role', true) = 'admin');
CREATE POLICY admin_creates_otp_history ON otp_history
  FOR INSERT
  WITH CHECK (current_setting('app.current_user_role', true) = 'admin');
CREATE POLICY admin_updates_otp_history ON otp_history
  FOR UPDATE
  USING (current_setting('app.current_user_role', true) = 'admin')
  WITH CHECK (current_setting('app.current_user_role', true) = 'admin');

DROP POLICY admin_full_access_payments ON payments;
CREATE POLICY admin_reads_payments ON payments
  FOR SELECT
  USING (current_setting('app.current_user_role', true) = 'admin');
CREATE POLICY admin_creates_payments ON payments
  FOR INSERT
  WITH CHECK (current_setting('app.current_user_role', true) = 'admin');
CREATE POLICY admin_updates_payments ON payments
  FOR UPDATE
  USING (current_setting('app.current_user_role', true) = 'admin')
  WITH CHECK (current_setting('app.current_user_role', true) = 'admin');

DROP POLICY admin_full_access_documents ON documents;
CREATE POLICY admin_reads_documents ON documents
  FOR SELECT
  USING (current_setting('app.current_user_role', true) = 'admin');
CREATE POLICY admin_creates_documents ON documents
  FOR INSERT
  WITH CHECK (current_setting('app.current_user_role', true) = 'admin');
CREATE POLICY admin_updates_documents ON documents
  FOR UPDATE
  USING (current_setting('app.current_user_role', true) = 'admin')
  WITH CHECK (current_setting('app.current_user_role', true) = 'admin');
