// Every route in routes/admin.js needs a real Cognito admin token to test
// past requireAuth (no AWS account exists yet -- see api/README.md's
// Testing section), so this only covers the "requires auth" boundary; the
// actual cross-seller admin access is proven at the RLS layer in
// admin.test.js, matching every other admin/webhook route in this API.
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

const protectedRoutes = [
  ["GET", "/api/admin/users"],
  ["GET", "/api/admin/users/someuser"],
  ["POST", "/api/admin/users/someuser/groups/seller"],
  ["DELETE", "/api/admin/users/someuser/groups/seller"],
  ["POST", "/api/admin/users/someuser/enable"],
  ["POST", "/api/admin/users/someuser/disable"],
  ["GET", "/api/admin/listings"],
  ["PATCH", "/api/admin/listings/some-id"],
  ["DELETE", "/api/admin/listings/some-id"],
  ["GET", "/api/admin/payments"],
  ["PATCH", "/api/admin/payments/some-id"],
  ["GET", "/api/admin/otps/some-id/documents"],
];

for (const [method, path] of protectedRoutes) {
  test(`${method} ${path} requires auth`, async () => {
    const res = await fetch(`${baseUrl}${path}`, { method });
    assert.equal(res.status, 401);
  });
}
