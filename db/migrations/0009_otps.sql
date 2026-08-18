-- Epic #7: guided OTP (Offer to Purchase) questionnaire + offer
-- accept/counter/reject, matching src/context/AppContext.jsx's otp/history
-- shape and MVP-SPEC.md #6 (OTP Builder, Offer Management).
CREATE TABLE otps (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id             uuid NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  seller_id              text NOT NULL,
  buyer_name             text NOT NULL,
  buyer_id_number        text NOT NULL,
  buyer_contact          text NOT NULL,
  offer_price            numeric(12, 2) NOT NULL,
  deposit                numeric(12, 2) NOT NULL,
  occupation_date        date NOT NULL,
  occupational_rent      numeric(12, 2),
  bond_amount            numeric(12, 2),
  fixtures               text NOT NULL DEFAULT '',
  suspensive_conditions  text NOT NULL DEFAULT '',
  special_conditions     text NOT NULL DEFAULT '',
  status                 text NOT NULL DEFAULT 'submitted'
                           CHECK (status IN ('submitted', 'countered', 'accepted', 'rejected')),
  counter_price          numeric(12, 2),
  signed_by_buyer        boolean NOT NULL DEFAULT false,
  signed_by_seller       boolean NOT NULL DEFAULT false,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX otps_listing_id_idx ON otps (listing_id);
CREATE INDEX otps_seller_id_idx ON otps (seller_id);

-- seller_id denormalized here too (from otps, not listings) so the seller
-- RLS policies below don't need a join.
CREATE TABLE otp_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  otp_id      uuid NOT NULL REFERENCES otps (id) ON DELETE CASCADE,
  seller_id   text NOT NULL,
  event       text NOT NULL,
  by_party    text NOT NULL CHECK (by_party IN ('buyer', 'seller')),
  amount      numeric(12, 2),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX otp_history_otp_id_idx ON otp_history (otp_id);
CREATE INDEX otp_history_seller_id_idx ON otp_history (seller_id);
