// RLS-focused tests for db/migrations/0012, same approach as otps.test.js
// -- exercises the otp_bearer/seller policies directly, no S3 involved.
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { withOtpAccess, withUserContext, pool } from "../db/pool.js";

process.env.NODE_ENV = "test";

const seller = { id: "doc-seller-1", groups: ["seller"] };
const otherSeller = { id: "doc-seller-2", groups: ["seller"] };
const listingId = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const otpId = randomUUID();
const otherOtpId = randomUUID();

before(async () => {
  await withUserContext(seller, (client) =>
    client.query(
      `INSERT INTO listings (id, seller_id, title, type, location, price, status)
       VALUES ($1, $2, 'Document Test Listing', 'House', 'Cape Town', 1000000, 'active')`,
      [listingId, seller.id]
    )
  );
  await withOtpAccess(otpId, (client) =>
    client.query(
      `INSERT INTO otps (id, listing_id, seller_id, buyer_name, buyer_id_number, buyer_contact,
                          offer_price, deposit, occupation_date)
       VALUES ($1, $2, $3, 'Buyer One', '8001015800082', '082 555 0100', 1000000, 100000, '2026-09-01')`,
      [otpId, listingId, seller.id]
    )
  );
});

after(async () => {
  await pool.query("DELETE FROM otps WHERE listing_id = $1", [listingId]);
  await withUserContext(seller, (client) =>
    client.query("DELETE FROM listings WHERE id = $1", [listingId])
  );
  await pool.end();
});

test("otp_bearer insert with a mismatched seller_id is rejected", async () => {
  await assert.rejects(
    withOtpAccess(otpId, (client) =>
      client.query(
        `INSERT INTO documents (otp_id, seller_id, doc_type, uploaded_by, s3_key)
         VALUES ($1, 'someone-else', 'buyer_id', 'buyer', 'x')`,
        [otpId]
      )
    )
  );
});

test("the otp_bearer for this id can insert and read its own document", async () => {
  await withOtpAccess(otpId, (client) =>
    client.query(
      `INSERT INTO documents (otp_id, seller_id, doc_type, uploaded_by, s3_key)
       VALUES ($1, $2, 'buyer_id', 'buyer', 'otps/${otpId}/buyer_id')`,
      [otpId, seller.id]
    )
  );
  const result = await withOtpAccess(otpId, (client) =>
    client.query("SELECT doc_type FROM documents WHERE otp_id = $1", [otpId])
  );
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].doc_type, "buyer_id");
});

test("a DIFFERENT otp_bearer cannot read it", async () => {
  const result = await withOtpAccess(otherOtpId, (client) =>
    client.query("SELECT doc_type FROM documents WHERE otp_id = $1", [otpId])
  );
  assert.equal(result.rows.length, 0);
});

test("the owning seller can read it too", async () => {
  const result = await withUserContext(seller, (client) =>
    client.query("SELECT doc_type FROM documents WHERE otp_id = $1", [otpId])
  );
  assert.equal(result.rows.length, 1);
});

test("a different seller cannot read it", async () => {
  const result = await withUserContext(otherSeller, (client) =>
    client.query("SELECT doc_type FROM documents WHERE otp_id = $1", [otpId])
  );
  assert.equal(result.rows.length, 0);
});

test("re-uploading the same doc_type replaces the row (ON CONFLICT)", async () => {
  await withOtpAccess(otpId, (client) =>
    client.query(
      `INSERT INTO documents (otp_id, seller_id, doc_type, uploaded_by, s3_key)
       VALUES ($1, $2, 'buyer_id', 'buyer', 'new-key')
       ON CONFLICT (otp_id, doc_type) DO UPDATE SET s3_key = EXCLUDED.s3_key`,
      [otpId, seller.id]
    )
  );
  const result = await withUserContext(seller, (client) =>
    client.query("SELECT s3_key FROM documents WHERE otp_id = $1 AND doc_type = 'buyer_id'", [otpId])
  );
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].s3_key, "new-key");
});

test("anonymous (no session vars) cannot read documents", async () => {
  const result = await pool.query("SELECT doc_type FROM documents WHERE otp_id = $1", [otpId]);
  assert.equal(result.rows.length, 0);
});
