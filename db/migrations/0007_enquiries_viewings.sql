-- Epic #6: Buyer enquiries and viewing requests (MVP-SPEC.md #6, "Buyer
-- Experience" + Seller Dashboard's Enquiries Inbox / Viewing Requests).
-- seller_id is denormalized from listings so it can drive RLS the same way
-- listings itself does, without a join on every policy check.
CREATE TABLE enquiries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  uuid NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  seller_id   text NOT NULL,
  name        text NOT NULL,
  email       text NOT NULL,
  phone       text NOT NULL DEFAULT '',
  message     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX enquiries_seller_id_idx ON enquiries (seller_id);
CREATE INDEX enquiries_listing_id_idx ON enquiries (listing_id);

CREATE TABLE viewing_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id     uuid NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  seller_id      text NOT NULL,
  name           text NOT NULL,
  email          text NOT NULL,
  phone          text NOT NULL DEFAULT '',
  requested_date date NOT NULL,
  requested_time time NOT NULL,
  proposed_date  date,
  proposed_time  time,
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rescheduled')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX viewing_requests_seller_id_idx ON viewing_requests (seller_id);
CREATE INDEX viewing_requests_listing_id_idx ON viewing_requests (listing_id);
