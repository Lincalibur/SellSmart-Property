// HTTP-level tests for the PayFast ITN webhook -- the one part of this
// epic that's fully testable end to end without a real Cognito token or a
// real PayFast merchant account, since it's authenticated by a signature
// this test computes with the exact same function the route verifies with
// (see payfast.test.js for the signature algorithm's own unit tests).
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { withUserContext, pool } from "../db/pool.js";
import { payfastSignature } from "../lib/payfast.js";

process.env.NODE_ENV = "test";
process.env.COGNITO_USER_POOL_ID = "af-south-1_test";

const { app } = await import("../index.js");

const seller = { id: "http-pay-seller-1", groups: ["seller"] };
const listingId = "12121212-1212-1212-1212-121212121212";
let server;
let baseUrl;
let paymentId;

before(async () => {
  await withUserContext(seller, (client) =>
    client.query(
      `INSERT INTO listings (id, seller_id, title, type, location, price, status)
       VALUES ($1, $2, 'HTTP Payment Test Listing', 'House', 'Cape Town', 1000000, 'draft')`,
      [listingId, seller.id]
    )
  );
  const inserted = await withUserContext(seller, (client) =>
    client.query(
      `INSERT INTO payments (listing_id, seller_id, package_id, amount, item_name)
       VALUES ($1, $2, 'starter', 699, 'Starter listing package') RETURNING id`,
      [listingId, seller.id]
    )
  );
  paymentId = inserted.rows[0].id;

  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://localhost:${server.address().port}`;
});

after(async () => {
  await pool.query("DELETE FROM payments WHERE listing_id = $1", [listingId]);
  await withUserContext(seller, (client) =>
    client.query("DELETE FROM listings WHERE id = $1", [listingId])
  );
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

function itnFields(overrides = {}) {
  return {
    m_payment_id: paymentId,
    pf_payment_id: "pf-12345",
    payment_status: "COMPLETE",
    amount_gross: "699.00",
    item_name: "Starter listing package",
    ...overrides,
  };
}

async function postItn(fields) {
  const signature = payfastSignature(fields);
  return fetch(`${baseUrl}/api/webhooks/payfast/itn`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...fields, signature }).toString(),
  });
}

test("a valid ITN marks the payment complete and activates the listing", async () => {
  const res = await postItn(itnFields());
  assert.equal(res.status, 200);

  const payment = await withUserContext(seller, (client) =>
    client.query("SELECT status, pf_payment_id FROM payments WHERE id = $1", [paymentId])
  );
  assert.equal(payment.rows[0].status, "complete");
  assert.equal(payment.rows[0].pf_payment_id, "pf-12345");

  const listingRes = await fetch(`${baseUrl}/api/listings/${listingId}`);
  assert.equal(listingRes.status, 200, "listing should now be active and publicly visible");
});

test("a duplicate ITN for an already-complete payment is idempotent", async () => {
  const res = await postItn(itnFields());
  assert.equal(res.status, 200);
  const payment = await withUserContext(seller, (client) =>
    client.query("SELECT status FROM payments WHERE id = $1", [paymentId])
  );
  assert.equal(payment.rows[0].status, "complete");
});

test("a tampered signature is rejected", async () => {
  const fields = itnFields({ amount_gross: "1.00" });
  const res = await fetch(`${baseUrl}/api/webhooks/payfast/itn`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    // Signed for the *original* fields, then the amount is changed after
    // signing -- simulates an attacker altering the payload in transit.
    body: new URLSearchParams({ ...fields, signature: payfastSignature(itnFields()) }).toString(),
  });
  assert.equal(res.status, 400);
});

test("an unknown m_payment_id 404s", async () => {
  const res = await postItn(itnFields({ m_payment_id: "00000000-0000-0000-0000-000000000000" }));
  assert.equal(res.status, 404);
});

test("POST /api/listings/:id/checkout requires auth", async () => {
  const res = await fetch(`${baseUrl}/api/listings/${listingId}/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ packageId: "starter" }),
  });
  assert.equal(res.status, 401);
});

test("GET /api/payments/mine requires auth", async () => {
  const res = await fetch(`${baseUrl}/api/payments/mine`);
  assert.equal(res.status, 401);
});
