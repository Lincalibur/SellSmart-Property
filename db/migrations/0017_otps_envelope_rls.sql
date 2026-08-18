-- Same "id is the capability" pattern as payfast_webhook (0014), applied
-- to DocuSign Connect's completion webhook (api/src/routes/docusign.js):
-- it calls in with no Cognito token either, verified by an HMAC signature
-- (api/src/lib/docusign.js) rather than anything RLS can see. The
-- identifying value here is envelope_id, not otps.id -- DocuSign generates
-- it, so the API only learns it *after* calling their envelope-creation
-- API and stores it on the row (0016). Both the UPDATE and its matching
-- SELECT policy are included together this time (see db/README.md's note
-- on 0015: an UPDATE-only policy without a matching SELECT policy silently
-- matches zero rows).
CREATE POLICY docusign_webhook_reads_by_envelope ON otps
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) = 'docusign_webhook'
    AND envelope_id = current_setting('app.current_envelope_id', true)
  );

CREATE POLICY docusign_webhook_updates_by_envelope ON otps
  FOR UPDATE
  USING (
    current_setting('app.current_user_role', true) = 'docusign_webhook'
    AND envelope_id = current_setting('app.current_envelope_id', true)
  )
  WITH CHECK (
    current_setting('app.current_user_role', true) = 'docusign_webhook'
    AND envelope_id = current_setting('app.current_envelope_id', true)
  );

-- Records "Signed by buyer"/"Signed by seller" in the history the same
-- way the (now-removed) simulated sign step used to. The subquery here is
-- fine -- unlike 0015's UPDATE case, this is an INSERT's WITH CHECK, and
-- docusign_webhook_reads_by_envelope above already grants this role
-- visibility of the one otps row the subquery needs.
CREATE POLICY docusign_webhook_creates_history ON otp_history
  FOR INSERT
  WITH CHECK (
    current_setting('app.current_user_role', true) = 'docusign_webhook'
    AND otp_id = (SELECT id FROM otps WHERE envelope_id = current_setting('app.current_envelope_id', true))
    AND seller_id = (SELECT seller_id FROM otps WHERE envelope_id = current_setting('app.current_envelope_id', true))
  );
