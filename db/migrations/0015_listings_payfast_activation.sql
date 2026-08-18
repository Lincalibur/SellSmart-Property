-- Completing payment (MVP-SPEC.md "Success Screen" -- "Your property is
-- now live!") flips the listing from draft to active. The ITN webhook
-- (api/src/routes/payments.js) already reads the payment's own listing_id
-- as part of handling the ITN, so this uses a second, explicit session var
-- -- app.current_activatable_listing_id -- set once that value is known,
-- rather than a subquery to `payments` inside the policy (same
-- id-in-session-var pattern otp_bearer/payfast_webhook already use
-- everywhere else).
--
-- Root cause found via EXPLAIN in CI, worth recording: for UPDATE, Postgres
-- requires a row to satisfy BOTH the UPDATE-applicable policies' USING
-- clauses AND the table's *SELECT*-applicable policies' USING clauses (it
-- needs to "see" the row to target it, same as a plain read) -- an UPDATE
-- policy alone is not sufficient if no SELECT policy also grants the role
-- visibility. payfast_webhook had no SELECT policy on `listings` at all,
-- so a still-draft listing (not yet 'active', so public_reads_active_listings
-- doesn't cover it either) was invisible for the UPDATE regardless of the
-- UPDATE policy itself being correct -- it silently matched zero rows, no
-- error. Apply the same "add a matching SELECT policy" fix to any future
-- UPDATE/DELETE-only policy on a table that doesn't already have one
-- covering that role.
CREATE POLICY payfast_webhook_reads_activatable_listing ON listings
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) = 'payfast_webhook'
    AND id::text = current_setting('app.current_activatable_listing_id', true)
  );

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
