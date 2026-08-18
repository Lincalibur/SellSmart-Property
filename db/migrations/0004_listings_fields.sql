-- Expands the minimal listings table from 0002 with the full field set
-- from MVP-SPEC.md #6 (Full Listing Creation steps 1-5), so the API can
-- serve real browse/search/detail data instead of src/data/seed.js.
ALTER TABLE listings
  ADD COLUMN type        text NOT NULL DEFAULT 'House',
  ADD COLUMN location     text NOT NULL DEFAULT '',
  ADD COLUMN beds         integer NOT NULL DEFAULT 0,
  ADD COLUMN baths        integer NOT NULL DEFAULT 0,
  ADD COLUMN parking      integer NOT NULL DEFAULT 0,
  ADD COLUMN size         integer NOT NULL DEFAULT 0,
  ADD COLUMN extras       jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN description  text NOT NULL DEFAULT '',
  ADD COLUMN images       jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN views        integer NOT NULL DEFAULT 0,
  ADD COLUMN updated_at   timestamptz NOT NULL DEFAULT now();

ALTER TABLE listings ALTER COLUMN type DROP DEFAULT;
ALTER TABLE listings ALTER COLUMN location DROP DEFAULT;

-- Supports GET /api/listings filters (status is always applied first via
-- the RLS policy or an explicit WHERE, so it leads the composite index).
CREATE INDEX listings_search_idx ON listings (status, type, price);
