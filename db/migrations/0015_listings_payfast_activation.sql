-- Completing payment (MVP-SPEC.md "Success Screen" -- "Your property is
-- now live!") flips the listing from draft to active. The ITN webhook
-- already runs as payfast_webhook, scoped to one payment via
-- app.current_payment_id (db/migrations/0014) -- this extends that same
-- capability to the *one* listing that payment belongs to, via a subquery
-- on payments rather than a second id-matching session var. A payment row
-- only exists at all once the seller created it for their own listing
-- (0014's seller_creates_own_payment), so this can't be used to activate
-- an unrelated listing.
CREATE POLICY payfast_webhook_activates_listing ON listings
  FOR UPDATE
  USING (
    current_setting('app.current_user_role', true) = 'payfast_webhook'
    AND id = (
      SELECT listing_id FROM payments
      WHERE id::text = current_setting('app.current_payment_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.current_user_role', true) = 'payfast_webhook'
    AND id = (
      SELECT listing_id FROM payments
      WHERE id::text = current_setting('app.current_payment_id', true)
    )
  );
