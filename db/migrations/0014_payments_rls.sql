-- Same reference pattern as the rest of db/migrations. The new wrinkle:
-- PayFast's ITN webhook (api/src/routes/payments.js) calls in with no
-- Cognito token at all -- it's authenticated by verifying PayFast's own
-- signature on the payload, not by anything RLS can see. Rather than a
-- role that can update any payment, withPaymentWebhookAccess
-- (api/src/db/pool.js) sets app.current_payment_id from the m_payment_id
-- the ITN payload references (which is the payments.id *we* generated and
-- sent to PayFast at checkout time), and the policy pins to that exact
-- row -- same "the id itself is the capability, never USING (true)"
-- defense-in-depth already used for otps/documents.
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments FORCE ROW LEVEL SECURITY;

-- Cross-checks listing_id/seller_id the same way 0008/0010's INSERT
-- policies do -- the API looks this up server-side first (see
-- api/src/routes/payments.js), but this is the real backstop: without it,
-- a seller could otherwise insert a payment row against a listing they
-- don't own.
CREATE POLICY seller_creates_own_payment ON payments
  FOR INSERT
  WITH CHECK (
    current_setting('app.current_user_role', true) = 'seller'
    AND seller_id = current_setting('app.current_user_id', true)
    AND seller_id = (SELECT seller_id FROM listings WHERE id = listing_id)
    AND (SELECT status FROM listings WHERE id = listing_id) = 'draft'
  );

CREATE POLICY seller_reads_own_payments ON payments
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) = 'seller'
    AND seller_id = current_setting('app.current_user_id', true)
  );

-- Needed for the UPDATE's own visibility, and also so
-- db/migrations/0015's cross-table policy (payfast_webhook activating the
-- listing a payment belongs to) can read this row via a subquery -- RLS
-- applies to that subquery too, so without this SELECT policy it would
-- silently see zero rows and never activate anything.
CREATE POLICY payfast_webhook_reads_own_payment ON payments
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) = 'payfast_webhook'
    AND id::text = current_setting('app.current_payment_id', true)
  );

CREATE POLICY payfast_webhook_updates_own_payment ON payments
  FOR UPDATE
  USING (
    current_setting('app.current_user_role', true) = 'payfast_webhook'
    AND id::text = current_setting('app.current_payment_id', true)
  )
  WITH CHECK (
    current_setting('app.current_user_role', true) = 'payfast_webhook'
    AND id::text = current_setting('app.current_payment_id', true)
  );

CREATE POLICY admin_full_access_payments ON payments
  FOR ALL
  USING (current_setting('app.current_user_role', true) = 'admin')
  WITH CHECK (current_setting('app.current_user_role', true) = 'admin');
