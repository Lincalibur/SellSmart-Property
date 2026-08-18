// RLS-focused tests for issue #12's back office. Every DB route in
// routes/admin.js relies on the admin_full_access policy each table
// already has (0003/0008/0010/0012/0014) -- this confirms admin can
// actually cross seller boundaries through those policies, which no
// earlier epic's tests exercised directly (they only ever tested that a
// *non*-admin was correctly blocked). There's no way to get a real
// Cognito admin token in CI, so requireAuth/requireRole themselves aren't
// exercised here -- see admin.http.test.js for the "requires auth" checks.
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { withOtpAccess, withUserContext, pool } from "../db/pool.js";

process.env.NODE_ENV = "test";

const admin = { id: "admin-2", groups: ["admin"] };
const seller = { id: "admin-test-seller-1", groups: ["seller"] };
const listingId = "15151515-1515-1515-1515-151515151515";
const otpId = randomUUID();

before(async () => {
  // listings/payments/otps each require a different listing status at
  // insert time (payments needs 'draft', otps needs 'active'), so this
  // creates the payment first, then flips the listing to 'active' before
  // creating the otp -- same order the real checkout -> publish -> offer
  // flow would produce.
  await withUserContext(seller, (client) =>
    client.query(
      `INSERT INTO listings (id, seller_id, title, type, location, price, status)
       VALUES ($1, $2, 'Admin Test Listing', 'House', 'Cape Town', 1000000, 'draft')`,
      [listingId, seller.id]
    )
  );
  await withUserContext(seller, (client) =>
    client.query(
      `INSERT INTO payments (listing_id, seller_id, package_id, amount, item_name)
       VALUES ($1, $2, 'starter', 699, 'Starter listing package')`,
      [listingId, seller.id]
    )
  );
  await withUserContext(seller, (client) =>
    client.query("UPDATE listings SET status = 'active' WHERE id = $1", [listingId])
  );
  await withOtpAccess(otpId, (client) =>
    client.query(
      `INSERT INTO otps (id, listing_id, seller_id, buyer_name, buyer_id_number, buyer_contact, buyer_email,
                          offer_price, deposit, occupation_date)
       VALUES ($1, $2, $3, 'Buyer One', '8001015800082', '082 555 0100', 'buyer@example.example', 1000000, 100000, '2026-09-01')`,
      [otpId, listingId, seller.id]
    )
  );
  await withOtpAccess(otpId, (client) =>
    client.query(
      `INSERT INTO documents (otp_id, seller_id, doc_type, uploaded_by, s3_key)
       VALUES ($1, $2, 'buyer_id', 'buyer', 'otps/${otpId}/buyer_id')`,
      [otpId, seller.id]
    )
  );
});

after(async () => {
  await pool.query("DELETE FROM otps WHERE listing_id = $1", [listingId]);
  await pool.query("DELETE FROM payments WHERE listing_id = $1", [listingId]);
  await withUserContext(seller, (client) =>
    client.query("DELETE FROM listings WHERE id = $1", [listingId])
  );
  await pool.end();
});

test("admin can read and update a listing owned by a different seller", async () => {
  const read = await withUserContext(admin, (client) =>
    client.query("SELECT status FROM listings WHERE id = $1", [listingId])
  );
  assert.equal(read.rows.length, 1);

  const updated = await withUserContext(admin, (client) =>
    client.query("UPDATE listings SET status = 'sold' WHERE id = $1 RETURNING status", [listingId])
  );
  assert.equal(updated.rows[0].status, "sold");
});

test("admin can read and update a payment owned by a different seller", async () => {
  const read = await withUserContext(admin, (client) =>
    client.query("SELECT status FROM payments WHERE listing_id = $1", [listingId])
  );
  assert.equal(read.rows.length, 1);

  const updated = await withUserContext(admin, (client) =>
    client.query("UPDATE payments SET status = 'complete' WHERE listing_id = $1 RETURNING status", [listingId])
  );
  assert.equal(updated.rows[0].status, "complete");
});

test("admin can read a document belonging to a different seller's transaction", async () => {
  const result = await withUserContext(admin, (client) =>
    client.query("SELECT doc_type, s3_key FROM documents WHERE otp_id = $1", [otpId])
  );
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].doc_type, "buyer_id");
});

test("a non-admin seller still cannot cross into another seller's listing", async () => {
  const otherSeller = { id: "admin-test-seller-2", groups: ["seller"] };
  const result = await withUserContext(otherSeller, (client) =>
    client.query("SELECT id FROM listings WHERE id = $1", [listingId])
  );
  assert.equal(result.rows.length, 0);
});
