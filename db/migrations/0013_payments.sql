-- Epic #9: once-off listing package fee via PayFast hosted checkout
-- (MVP-SPEC.md #6 "Payment Screen") + ITN webhook. Unlike enquiries/otps,
-- the *seller* initiates this (paying to publish their own listing), so
-- there's no otp_bearer-style anonymous actor here -- the only unusual
-- writer is PayFast's own server, calling the ITN webhook with no Cognito
-- token at all (see db/migrations/0014's payfast_webhook role).
CREATE TABLE payments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id        uuid NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  seller_id         text NOT NULL,
  package_id        text NOT NULL CHECK (package_id IN ('starter', 'smart', 'pro')),
  amount            numeric(12, 2) NOT NULL,
  item_name         text NOT NULL,
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'complete', 'failed', 'cancelled')),
  pf_payment_id     text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payments_listing_id_idx ON payments (listing_id);
CREATE INDEX payments_seller_id_idx ON payments (seller_id);
