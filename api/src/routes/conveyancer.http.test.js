// This route needs a real seller Cognito token to exercise past
// requireAuth (no AWS account exists yet -- see api/README.md's Testing
// section), so unlike most routes in this API it has no dedicated RLS test
// either: it doesn't add any new RLS of its own, reusing 0010's existing
// seller_updates_own_otps policy unchanged (see db/migrations/0020's
// comment). This is the one thing about it that's independently
// verifiable over HTTP.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";

process.env.NODE_ENV = "test";
process.env.COGNITO_USER_POOL_ID = "af-south-1_test";

const { app } = await import("../index.js");

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://localhost:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test("POST /api/otps/mine/:id/send-to-conveyancer requires auth", async () => {
  const res = await fetch(`${baseUrl}/api/otps/mine/some-id/send-to-conveyancer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ providerId: "x", sellerName: "Seller", sellerEmail: "seller@example.example" }),
  });
  assert.equal(res.status, 401);
});
