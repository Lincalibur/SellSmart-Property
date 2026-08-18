// HTTP-level tests for the full OTP builder + offer management flow --
// see otps.test.js for the RLS-focused tests these build on.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { withUserContext, pool } from "../db/pool.js";

process.env.NODE_ENV = "test";
process.env.COGNITO_USER_POOL_ID = "af-south-1_test";

const { app } = await import("../index.js");

const seller = { id: "http-otp-seller-1", groups: ["seller"] };
const listingId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
let server;
let baseUrl;

before(async () => {
  await withUserContext(seller, (client) =>
    client.query(
      `INSERT INTO listings (id, seller_id, title, type, location, price, status)
       VALUES ($1, $2, 'HTTP OTP Test Listing', 'House', 'Cape Town', 1000000, 'active')`,
      [listingId, seller.id]
    )
  );
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://localhost:${server.address().port}`;
});

after(async () => {
  await pool.query("DELETE FROM otps WHERE listing_id = $1", [listingId]);
  await withUserContext(seller, (client) =>
    client.query("DELETE FROM listings WHERE id = $1", [listingId])
  );
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test("full OTP flow: submit, then buyer-side transitions before acceptance", async () => {
  const submitRes = await fetch(`${baseUrl}/api/listings/${listingId}/otps`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      buyer: { name: "Buyer One", idNumber: "8001015800082", contact: "082 555 0100" },
      offerPrice: 950000,
      deposit: 95000,
      occupationDate: "2026-09-01",
    }),
  });
  assert.equal(submitRes.status, 201);
  const submitted = await submitRes.json();
  assert.equal(submitted.status, "submitted");
  assert.equal(submitted.history.length, 1);
  const otpId = submitted.id;

  const getRes = await fetch(`${baseUrl}/api/otps/${otpId}`);
  assert.equal(getRes.status, 200);
  assert.equal((await getRes.json()).offerPrice, 950000);

  // Seller-side transitions (counter/accept/reject/sign) need requireAuth,
  // which can't be exercised without a real Cognito pool -- proven at the
  // RLS layer instead, in otps.test.js. This confirms the buyer-facing
  // half of the request pipeline (routing, JSON parsing, history rows,
  // RETURNING) works end to end, including guarding against skipping
  // straight to accept-counter/sign without a seller response first.
  const acceptCounterOn404 = await fetch(`${baseUrl}/api/otps/${otpId}/accept-counter`, { method: "POST" });
  assert.equal(acceptCounterOn404.status, 400, "no counter-offer exists yet");

  const signBeforeAccepted = await fetch(`${baseUrl}/api/otps/${otpId}/sign`, { method: "POST" });
  assert.equal(signBeforeAccepted.status, 400, "can't sign before the offer is accepted");
});

test("POST /api/listings/:id/otps 404s for an unknown listing", async () => {
  const res = await fetch(`${baseUrl}/api/listings/00000000-0000-0000-0000-000000000000/otps`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      buyer: { name: "Buyer", idNumber: "1", contact: "1" },
      offerPrice: 1,
      deposit: 1,
      occupationDate: "2026-09-01",
    }),
  });
  assert.equal(res.status, 404);
});

test("GET /api/otps/:id 404s for an unknown id", async () => {
  const res = await fetch(`${baseUrl}/api/otps/00000000-0000-0000-0000-000000000000`);
  assert.equal(res.status, 404);
});

test("GET /api/otps/mine requires auth", async () => {
  const res = await fetch(`${baseUrl}/api/otps/mine`);
  assert.equal(res.status, 401);
});

test("PATCH /api/otps/mine/:id requires auth", async () => {
  const res = await fetch(`${baseUrl}/api/otps/mine/some-id`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision: "accept" }),
  });
  assert.equal(res.status, 401);
});

test("POST /api/otps/mine/:id/sign requires auth", async () => {
  const res = await fetch(`${baseUrl}/api/otps/mine/some-id/sign`, { method: "POST" });
  assert.equal(res.status, 401);
});
