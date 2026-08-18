import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { withUserContext, pool } from "../db/pool.js";

process.env.NODE_ENV = "test";

const seller = { id: "view-seller-1", groups: ["seller"] };
const otherSeller = { id: "view-seller-2", groups: ["seller"] };
const listingId = "77777777-7777-7777-7777-777777777777";
// Generated here rather than read back via RETURNING -- see the comment in
// routes/enquiries.js on why an anonymous INSERT can't use RETURNING.
const viewingId = randomUUID();

before(async () => {
  await withUserContext(seller, (client) =>
    client.query(
      `INSERT INTO listings (id, seller_id, title, type, location, price, status)
       VALUES ($1, $2, 'Viewing Test Listing', 'House', 'Cape Town', 1000000, 'active')`,
      [listingId, seller.id]
    )
  );
  await pool.query(
    `INSERT INTO viewing_requests (id, listing_id, seller_id, name, email, requested_date, requested_time)
     VALUES ($1, $2, $3, 'Buyer One', 'buyer@example.com', '2026-09-01', '10:00')`,
    [viewingId, listingId, seller.id]
  );
});

after(async () => {
  await pool.query("DELETE FROM viewing_requests WHERE listing_id = $1", [listingId]);
  await withUserContext(seller, (client) =>
    client.query("DELETE FROM listings WHERE id = $1", [listingId])
  );
  await pool.end();
});

test("the owning seller can accept a viewing request", async () => {
  const result = await withUserContext(seller, (client) =>
    client.query(
      "UPDATE viewing_requests SET status = 'accepted' WHERE id = $1 RETURNING status",
      [viewingId]
    )
  );
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].status, "accepted");
});

test("a different seller cannot update it", async () => {
  const result = await withUserContext(otherSeller, (client) =>
    client.query(
      "UPDATE viewing_requests SET status = 'rescheduled' WHERE id = $1 RETURNING status",
      [viewingId]
    )
  );
  assert.equal(result.rows.length, 0, "RLS must block cross-seller writes");
});

test("a buyer role cannot read viewing requests", async () => {
  const result = await withUserContext({ id: "some-buyer", groups: ["buyer"] }, (client) =>
    client.query("SELECT id FROM viewing_requests WHERE id = $1", [viewingId])
  );
  assert.equal(result.rows.length, 0);
});
