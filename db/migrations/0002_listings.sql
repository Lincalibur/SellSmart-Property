-- Minimal seed of the schema this epic needs to demonstrate the RBAC/RLS
-- pattern. The listings & search epic (issue #5) expands this table with
-- the full field set from MVP-SPEC.md #6 (photos, description, key
-- details, etc.) -- this migration only needs enough columns to prove the
-- access-control pattern works end to end.
CREATE TABLE listings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id   text NOT NULL, -- Cognito sub of the owning seller
  title       text NOT NULL,
  price       numeric(12, 2) NOT NULL,
  status      text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'under_offer', 'sold')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX listings_seller_id_idx ON listings (seller_id);
