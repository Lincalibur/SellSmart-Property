// HTTP-level tests for the public POST routes -- see enquiries.test.js /
// viewings.test.js for the RLS-focused tests these build on.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { withUserContext, pool } from "../db/pool.js";

process.env.NODE_ENV = "test";
process.env.COGNITO_USER_POOL_ID = "af-south-1_test";

process.stderr.write("DIAG: before import\n");
const { app } = await import("../index.js");
process.stderr.write("DIAG: after import\n");

const seller = { id: "http-enq-seller-1", groups: ["seller"] };
const activeListingId = "88888888-8888-8888-8888-888888888888";
const draftListingId = "99999999-9999-9999-9999-999999999999";
let server;
let baseUrl;

before(async () => {
  process.stderr.write("DIAG: before hook start\n");
  await withUserContext(seller, (client) =>
    client.query(
      `INSERT INTO listings (id, seller_id, title, type, location, price, status)
       VALUES
         ($1, $3, 'Active Listing', 'House', 'Cape Town', 1000000, 'active'),
         ($2, $3, 'Draft Listing', 'House', 'Cape Town', 1000000, 'draft')`,
      [activeListingId, draftListingId, seller.id]
    )
  );
  process.stderr.write("DIAG: listings inserted\n");
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  process.stderr.write("DIAG: server listening\n");
  baseUrl = `http://localhost:${server.address().port}`;
});

after(async () => {
  await pool.query("DELETE FROM enquiries WHERE listing_id = ANY($1)", [
    [activeListingId, draftListingId],
  ]);
  await pool.query("DELETE FROM viewing_requests WHERE listing_id = ANY($1)", [
    [activeListingId, draftListingId],
  ]);
  await withUserContext(seller, (client) =>
    client.query("DELETE FROM listings WHERE seller_id = $1", [seller.id])
  );
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test("POST /api/listings/:id/enquiries creates an enquiry on an active listing", async () => {
  const res = await fetch(`${baseUrl}/api/listings/${activeListingId}/enquiries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Buyer", email: "buyer@example.com", message: "Interested!" }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.listingId, activeListingId);
});

test("POST /api/listings/:id/enquiries 404s for a draft listing", async () => {
  const res = await fetch(`${baseUrl}/api/listings/${draftListingId}/enquiries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Buyer", email: "buyer@example.com", message: "Interested!" }),
  });
  assert.equal(res.status, 404);
});

test("POST /api/listings/:id/viewings creates a viewing request", async () => {
  const res = await fetch(`${baseUrl}/api/listings/${activeListingId}/viewings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Buyer",
      email: "buyer@example.com",
      date: "2026-09-01",
      time: "10:00",
    }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.status, "pending");
});

test("GET /api/enquiries/mine requires auth", async () => {
  const res = await fetch(`${baseUrl}/api/enquiries/mine`);
  assert.equal(res.status, 401);
});

test("GET /api/viewings/mine requires auth", async () => {
  const res = await fetch(`${baseUrl}/api/viewings/mine`);
  assert.equal(res.status, 401);
});

test("PATCH /api/viewings/:id requires auth", async () => {
  const res = await fetch(`${baseUrl}/api/viewings/some-id`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "accepted" }),
  });
  assert.equal(res.status, 401);
});
