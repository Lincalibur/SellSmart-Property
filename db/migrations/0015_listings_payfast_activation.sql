-- Completing payment (MVP-SPEC.md "Success Screen" -- "Your property is
-- now live!") flips the listing from draft to active. The ITN webhook
-- (api/src/routes/payments.js) already reads the payment's own listing_id
-- as part of handling the ITN, so rather than a policy that re-derives it
-- via a subquery to `payments` at evaluation time, the API sets a second,
-- explicit session var -- app.current_activatable_listing_id -- once it
-- already knows the value. Simpler and more robust than the subquery
-- version this replaced during development: a cross-table subquery in an
-- UPDATE's USING clause between two FORCE RLS tables that each reference
-- the other (payments' INSERT check reads listings; this would have read
-- payments back) consistently matched zero rows in testing despite every
-- component of the boolean logic checking out individually -- not worth
-- chasing further when the direct id-in-session-var pattern (the same one
-- otp_bearer and payfast_webhook already use elsewhere) sidesteps it
-- entirely.
CREATE POLICY payfast_webhook_activates_listing ON listings
  FOR UPDATE
  USING (
    current_setting('app.current_user_role', true) = 'payfast_webhook'
    AND id::text = current_setting('app.current_activatable_listing_id', true)
  )
  WITH CHECK (
    current_setting('app.current_user_role', true) = 'payfast_webhook'
    AND id::text = current_setting('app.current_activatable_listing_id', true)
  );
