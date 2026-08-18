// Full HTTP-level upload flow against a real S3-compatible endpoint
// (LocalStack in CI -- see the api-test job in .github/workflows/ci.yml).
// Unlike every other *.http.test.js so far, this actually exercises S3,
// not just Postgres, since the whole point of issue #8 is getting that
// integration right.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { withUserContext, pool } from "../db/pool.js";

process.env.NODE_ENV = "test";
process.env.COGNITO_USER_POOL_ID = "af-south-1_test";

const { app } = await import("../index.js");

const seller = { id: "http-doc-seller-1", groups: ["seller"] };
const listingId = "dddddddd-dddd-dddd-dddd-dddddddddddd";
let server;
let baseUrl;
let otpId;

before(async () => {
  await withUserContext(seller, (client) =>
    client.query(
      `INSERT INTO listings (id, seller_id, title, type, location, price, status)
       VALUES ($1, $2, 'HTTP Document Test Listing', 'House', 'Cape Town', 1000000, 'active')`,
      [listingId, seller.id]
    )
  );
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://localhost:${server.address().port}`;

  const otpRes = await fetch(`${baseUrl}/api/listings/${listingId}/otps`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      buyer: { name: "Buyer One", idNumber: "8001015800082", contact: "082 555 0100", email: "buyer@example.example" },
      offerPrice: 1000000,
      deposit: 100000,
      occupationDate: "2026-09-01",
    }),
  });
  otpId = (await otpRes.json()).id;
});

after(async () => {
  await pool.query("DELETE FROM documents WHERE otp_id = $1", [otpId]);
  await pool.query("DELETE FROM otps WHERE listing_id = $1", [listingId]);
  await withUserContext(seller, (client) =>
    client.query("DELETE FROM listings WHERE id = $1", [listingId])
  );
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test("buyer uploads a document: upload-url -> PUT to S3 -> confirm -> list with a working download URL", async () => {
  const uploadUrlRes = await fetch(`${baseUrl}/api/otps/${otpId}/documents/upload-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ docType: "buyer_id" }),
  });
  assert.equal(uploadUrlRes.status, 200);
  const { uploadUrl } = await uploadUrlRes.json();

  const fileContents = "this is a fake ID document";
  const putRes = await fetch(uploadUrl, { method: "PUT", body: fileContents });
  assert.equal(putRes.status, 200, `PUT to presigned URL failed: ${await putRes.text()} (url: ${uploadUrl})`);

  const confirmRes = await fetch(`${baseUrl}/api/otps/${otpId}/documents/buyer_id/confirm`, { method: "POST" });
  assert.equal(confirmRes.status, 201);
  const confirmed = await confirmRes.json();
  assert.equal(confirmed.docType, "buyer_id");
  assert.equal(confirmed.uploadedBy, "buyer");

  const listRes = await fetch(`${baseUrl}/api/otps/${otpId}/documents`);
  assert.equal(listRes.status, 200);
  const documents = await listRes.json();
  assert.equal(documents.length, 1);
  assert.equal(documents[0].docType, "buyer_id");

  const downloadRes = await fetch(documents[0].downloadUrl);
  assert.equal(downloadRes.status, 200);
  assert.equal(await downloadRes.text(), fileContents);
});

test("confirm 400s if nothing was actually uploaded to that key", async () => {
  const res = await fetch(`${baseUrl}/api/otps/${otpId}/documents/proof_of_address/confirm`, { method: "POST" });
  assert.equal(res.status, 400);
});

test("upload-url rejects an unknown docType", async () => {
  const res = await fetch(`${baseUrl}/api/otps/${otpId}/documents/upload-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ docType: "not-a-real-type" }),
  });
  assert.equal(res.status, 400);
});

test("GET /api/otps/mine/:id/documents requires auth", async () => {
  const res = await fetch(`${baseUrl}/api/otps/mine/${otpId}/documents`);
  assert.equal(res.status, 401);
});

test("POST /api/otps/mine/:id/documents/upload-url requires auth", async () => {
  const res = await fetch(`${baseUrl}/api/otps/mine/${otpId}/documents/upload-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ docType: "title_deed" }),
  });
  assert.equal(res.status, 401);
});
