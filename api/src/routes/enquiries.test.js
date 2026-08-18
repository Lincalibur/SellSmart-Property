// Same approach as listings.test.js: exercises the RLS policies in
// db/migrations/0008 directly via withUserContext, since there's no way to
// get a real Cognito token in CI yet.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { withUserContext, pool } from "../db/pool.js";

process.env.NODE_ENV = "test";

const seller = { id: "enq-seller-1", groups: ["seller"] };
const otherSeller = { id: "enq-seller-2", groups: ["seller"] };
const listingId = "66666666-6666-6666-6666-666666666666";

before(async () => {
  await withUserContext(seller, (client) =>
    client.query(
      `INSERT INTO listings (id, seller_id, title, type, location, price, status)
       VALUES ($1, $2, 'Enquiry Test Listing', 'House', 'Cape Town', 1000000, 'active')`,
      [listingId, seller.id]
    )
  );
  // Simulates what POST /api/listings/:id/enquiries does: an anonymous
  // insert with a server-looked-up seller_id, not a session-var-carrying one.
  await pool.query(
    `INSERT INTO enquiries (listing_id, seller_id, name, email, message)
     VALUES ($1, $2, 'Buyer One', 'buyer@example.com', 'Is this still available?')`,
    [listingId, seller.id]
  );
});

after(async () => {
  await pool.query("DELETE FROM enquiries WHERE listing_id = $1", [listingId]);
  await withUserContext(seller, (client) =>
    client.query("DELETE FROM listings WHERE id = $1", [listingId])
  );
  await pool.end();
});

test("an anonymous insert with a mismatched seller_id is rejected", async () => {
  await assert.rejects(
    pool.query(
      `INSERT INTO enquiries (listing_id, seller_id, name, email, message)
       VALUES ($1, 'someone-else', 'x', 'x@example.com', 'x')`,
      [listingId]
    )
  );
});

test("the owning seller sees the enquiry", async () => {
  const result = await withUserContext(seller, (client) =>
    client.query("SELECT id FROM enquiries WHERE listing_id = $1", [listingId])
  );
  assert.equal(result.rows.length, 1);
});

test("a different seller cannot see it", async () => {
  const result = await withUserContext(otherSeller, (client) =>
    client.query("SELECT id FROM enquiries WHERE listing_id = $1", [listingId])
  );
  assert.equal(result.rows.length, 0);
});

test("anonymous (no session vars) cannot read enquiries", async () => {
  const result = await pool.query("SELECT id FROM enquiries WHERE listing_id = $1", [listingId]);
  assert.equal(result.rows.length, 0);
});
