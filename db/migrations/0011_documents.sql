-- Epic #8: Document Hub (real storage). Sparse table -- a row only exists
-- once a document has actually been uploaded to S3; "pending" (per
-- src/data/seed.js's DOCUMENT_CHECKLIST) is just the absence of a row for
-- that doc_type, computed by the frontend, not stored here.
--
-- doc_type mirrors DOCUMENT_CHECKLIST's d1-d8 (buyer_id = d1 Certified
-- ID/Passport, proof_of_address = d2, offer_to_purchase = d3 signed OTP,
-- proof_of_funds = d4, title_deed = d5, condition_disclosure = d6,
-- electrical_coc = d7, rates_clearance = d8) -- keep this CHECK and that
-- list in sync if either changes.
CREATE TABLE documents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  otp_id       uuid NOT NULL REFERENCES otps (id) ON DELETE CASCADE,
  seller_id    text NOT NULL,
  doc_type     text NOT NULL CHECK (doc_type IN (
                 'buyer_id', 'proof_of_address', 'offer_to_purchase', 'proof_of_funds',
                 'title_deed', 'condition_disclosure', 'electrical_coc', 'rates_clearance'
               )),
  uploaded_by  text NOT NULL CHECK (uploaded_by IN ('buyer', 'seller')),
  s3_key       text NOT NULL,
  uploaded_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (otp_id, doc_type)
);

CREATE INDEX documents_otp_id_idx ON documents (otp_id);
CREATE INDEX documents_seller_id_idx ON documents (seller_id);
