// HTTP-level tests for the DocuSign Connect webhook -- same approach as
// payments.http.test.js's ITN test: compute a valid signature with the
// exact function the route verifies with, post a payload shaped like
// DocuSign's real one, and confirm the DB updates. No live DocuSign
// account/Connect delivery involved (there's no self-hostable emulator for
// it, same situation as PayFast).
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { after, before, test } from "node:test";
import { withOtpAccess, withUserContext, pool } from "../db/pool.js";

process.env.NODE_ENV = "test";
process.env.COGNITO_USER_POOL_ID = "af-south-1_test";
process.env.DOCUSIGN_CONNECT_HMAC_KEY = "test-hmac-key";

const { app } = await import("../index.js");

const seller = { id: "http-ds-seller-1", groups: ["seller"] };
const listingId = "14141414-1414-1414-1414-141414141414";
const otpId = randomUUID();
const envelopeId = `envelope-${randomUUID()}`;
let server;
let baseUrl;

before(async () => {
  await withUserContext(seller, (client) =>
    client.query(
      `INSERT INTO listings (id, seller_id, title, type, location, price, status)
       VALUES ($1, $2, 'HTTP DocuSign Test Listing', 'House', 'Cape Town', 1000000, 'active')`,
      [listingId, seller.id]
    )
  );
  await withOtpAccess(otpId, (client) =>
    client.query(
      `INSERT INTO otps (id, listing_id, seller_id, buyer_name, buyer_id_number, buyer_contact,
                          offer_price, deposit, occupation_date, status, envelope_id)
       VALUES ($1, $2, $3, 'Buyer One', '8001015800082', '082 555 0100', 1000000, 100000, '2026-09-01', 'accepted', $4)`,
      [otpId, listingId, seller.id, envelopeId]
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

function connectPayload(signerStatuses) {
  return JSON.stringify({
    event: "envelope-completed",
    data: {
      envelopeId,
      envelopeSummary: {
        recipients: {
          signers: Object.entries(signerStatuses).map(([clientUserId, status]) => ({ clientUserId, status })),
        },
      },
    },
  });
}

async function postConnect(bodyString, key = "test-hmac-key") {
  const body = Buffer.from(bodyString);
  const signature = createHmac("sha256", key).update(body).digest("base64");
  return fetch(`${baseUrl}/api/webhooks/docusign/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-DocuSign-Signature-1": signature },
    body,
  });
}

test("a valid Connect payload records the buyer's signature", async () => {
  const res = await postConnect(connectPayload({ buyer: "completed", seller: "sent" }));
  assert.equal(res.status, 200);

  const otp = await withUserContext(seller, (client) =>
    client.query("SELECT signed_by_buyer, signed_by_seller FROM otps WHERE id = $1", [otpId])
  );
  assert.equal(otp.rows[0].signed_by_buyer, true);
  assert.equal(otp.rows[0].signed_by_seller, false);

  const history = await withUserContext(seller, (client) =>
    client.query("SELECT event FROM otp_history WHERE otp_id = $1", [otpId])
  );
  assert.deepEqual(
    history.rows.map((r) => r.event),
    ["Signed by buyer"]
  );
});

test("a second Connect payload completing the seller too records that, without duplicating the buyer's history", async () => {
  const res = await postConnect(connectPayload({ buyer: "completed", seller: "completed" }));
  assert.equal(res.status, 200);

  const otp = await withUserContext(seller, (client) =>
    client.query("SELECT signed_by_buyer, signed_by_seller FROM otps WHERE id = $1", [otpId])
  );
  assert.equal(otp.rows[0].signed_by_buyer, true);
  assert.equal(otp.rows[0].signed_by_seller, true);

  const history = await withUserContext(seller, (client) =>
    client.query("SELECT event FROM otp_history WHERE otp_id = $1 ORDER BY created_at")
  );
  assert.deepEqual(
    history.rows.map((r) => r.event),
    ["Signed by buyer", "Signed by seller"]
  );
});

test("a tampered payload is rejected", async () => {
  const original = connectPayload({ buyer: "completed" });
  const signature = createHmac("sha256", "test-hmac-key").update(Buffer.from(original)).digest("base64");
  const res = await fetch(`${baseUrl}/api/webhooks/docusign/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-DocuSign-Signature-1": signature },
    body: connectPayload({ buyer: "completed", seller: "completed" }), // signed for a different payload
  });
  assert.equal(res.status, 400);
});

test("an unknown envelopeId 404s", async () => {
  const res = await postConnect(
    JSON.stringify({ data: { envelopeId: "no-such-envelope", envelopeSummary: { recipients: { signers: [] } } } })
  );
  assert.equal(res.status, 404);
});

test("POST /api/otps/mine/:id/envelope requires auth", async () => {
  const res = await fetch(`${baseUrl}/api/otps/mine/${otpId}/envelope`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ buyerEmail: "buyer@example.com", sellerEmail: "seller@example.com", sellerName: "Seller" }),
  });
  assert.equal(res.status, 401);
});

test("GET /api/otps/mine/:id/signing-url requires auth", async () => {
  const res = await fetch(`${baseUrl}/api/otps/mine/${otpId}/signing-url?returnUrl=https://example.com&name=Seller&email=seller@example.com`);
  assert.equal(res.status, 401);
});

test("GET /api/otps/:id/signing-url requires name/email query params", async () => {
  const res = await fetch(`${baseUrl}/api/otps/${otpId}/signing-url?returnUrl=https://example.com`);
  assert.equal(res.status, 400);
});
