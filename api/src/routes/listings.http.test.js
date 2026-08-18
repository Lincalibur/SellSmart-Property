// HTTP-level tests for the public (unauthenticated) browse/search/detail
// routes -- see listings.test.js for the RLS-focused tests these build on.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { withUserContext, pool } from "../db/pool.js";

process.env.NODE_ENV = "test";
process.env.COGNITO_USER_POOL_ID = "af-south-1_test";

const { app } = await import("../index.js");

const seller = { id: "http-seller-1", groups: ["seller"] };
let server;
let baseUrl;

before(async () => {
  await withUserContext(seller, (client) =>
    client.query(
      `INSERT INTO listings (id, seller_id, title, type, location, price, status)
       VALUES
         ('33333333-3333-3333-3333-333333333333', $1, 'Sandton Apartment', 'Apartment', 'Sandton, Johannesburg', 1450000, 'active'),
         ('44444444-4444-4444-4444-444444444444', $1, 'Constantia House', 'House', 'Constantia, Cape Town', 1950000, 'active'),
         ('55555555-5555-5555-5555-555555555555', $1, 'Unlisted Draft', 'House', 'Constantia, Cape Town', 3000000, 'draft')`,
      [seller.id]
    )
  );

  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://localhost:${server.address().port}`;
});

after(async () => {
  await withUserContext(seller, (client) =>
    client.query("DELETE FROM listings WHERE seller_id = $1", [seller.id])
  );
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test("GET /api/listings returns only active listings", async () => {
  const res = await fetch(`${baseUrl}/api/listings`);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.ok(body.every((listing) => listing.status === "active"));
  assert.ok(!body.some((listing) => listing.title === "Unlisted Draft"));
});

test("GET /api/listings filters by location, type and price range", async () => {
  const res = await fetch(
    `${baseUrl}/api/listings?location=Constantia&type=House&minPrice=1000000&maxPrice=2000000`
  );
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.length, 1);
  assert.equal(body[0].title, "Constantia House");
});

test("GET /api/listings/:id returns an active listing", async () => {
  const res = await fetch(`${baseUrl}/api/listings/33333333-3333-3333-3333-333333333333`);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.title, "Sandton Apartment");
});

test("GET /api/listings/:id 404s for a draft listing (not public)", async () => {
  const res = await fetch(`${baseUrl}/api/listings/55555555-5555-5555-5555-555555555555`);
  assert.equal(res.status, 404);
});

test("POST /api/listings requires auth", async () => {
  const res = await fetch(`${baseUrl}/api/listings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "x", type: "House", location: "x", price: 1 }),
  });
  assert.equal(res.status, 401);
});
