// HTTP-level tests for the public marketplace routes -- see
// providers.test.js for the RLS-focused tests these build on.
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

test("GET /api/providers lists the seeded catalog (db/migrations/0018)", async () => {
  const res = await fetch(`${baseUrl}/api/providers`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.length >= 9, "expects at least the 9 providers seeded in 0018");
});

test("GET /api/providers?category filters", async () => {
  const res = await fetch(`${baseUrl}/api/providers?category=Conveyancers`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.length >= 2);
  assert.ok(body.every((p) => p.category === "Conveyancers"));
});

test("GET /api/providers/:id 404s for an unknown id", async () => {
  const res = await fetch(`${baseUrl}/api/providers/00000000-0000-0000-0000-000000000000`);
  assert.equal(res.status, 404);
});

test("POST /api/providers requires auth", async () => {
  const res = await fetch(`${baseUrl}/api/providers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "x", category: "Conveyancers", location: "x", email: "x@example.example" }),
  });
  assert.equal(res.status, 401);
});
