-- Conveyancer Handoff (MVP-SPEC.md #6): the seller selects a provider from
-- the marketplace once the OTP is fully signed, and the system emails
-- them the deal details (api/src/routes/conveyancer.js). No webhook/
-- capability role needed here, unlike payments/e-signature -- there's no
-- callback from the conveyancer's side ("their updates are manual/
-- email-driven for now", MVP-SPEC.md's explicit-out-of-scope list), so
-- this is a normal seller-authenticated write, covered by the existing
-- seller_updates_own_otps policy from db/migrations/0010 -- no new RLS
-- needed.
ALTER TABLE otps
  ADD COLUMN conveyancer_provider_id uuid REFERENCES providers (id),
  ADD COLUMN conveyancer_sent_at timestamptz;
