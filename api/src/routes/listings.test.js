// Requires a real DATABASE_URL with the db/migrations applied (see
// scripts/migrate.js and the api-test CI job) -- unlike index.test.js's
// smoke test, these exercise real queries against Postgres, including the
// RLS policies in db/migrations/0003-0006. There's no way to get a real
// Cognito access token in CI (no AWS account exists yet -- see
// db/README.md), so requireAuth itself isn't exercised here; instead these
// tests call withUserContext directly with the same shape of user object
// requireAuth attaches to req.user, which is the actual security boundary
// (RLS), not the JWT verification step.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { withUserContext, pool } from "../db/pool.js";

process.env.NODE_ENV = "test";

const seller = { id: "seller-1", groups: ["seller"] };
const otherSeller = { id: "seller-2", groups: ["seller"] };
const buyer = { id: "buyer-1", groups: ["buyer"] };

let activeId;
let draftId;

before(async () => {
  await withUserContext(seller, (client) =>
    client.query(
      `INSERT INTO listings (id, seller_id, title, type, location, price, status)
       VALUES ('11111111-1111-1111-1111-111111111111', $1, 'Active Listing', 'House', 'Cape Town', 1000000, 'active')`,
      [seller.id]
    )
  );
  await withUserContext(seller, (client) =>
    client.query(
      `INSERT INTO listings (id, seller_id, title, type, location, price, status)
       VALUES ('22222222-2222-2222-2222-222222222222', $1, 'Draft Listing', 'House', 'Cape Town', 2000000, 'draft')`,
      [seller.id]
    )
  );
  activeId = "11111111-1111-1111-1111-111111111111";
  draftId = "22222222-2222-2222-2222-222222222222";
});

after(async () => {
  await withUserContext(seller, (client) =>
    client.query("DELETE FROM listings WHERE seller_id = $1", [seller.id])
  );
  await pool.end();
});

test("anonymous (no session vars) sees only active listings", async () => {
  const result = await pool.query("SELECT id, status FROM listings ORDER BY created_at");
  assert.ok(result.rows.every((row) => row.status === "active"));
  assert.ok(result.rows.some((row) => row.id === activeId));
  assert.ok(!result.rows.some((row) => row.id === draftId));
});

test("a buyer sees only active listings, never another seller's draft", async () => {
  const result = await withUserContext(buyer, (client) =>
    client.query("SELECT id, status FROM listings ORDER BY created_at")
  );
  assert.ok(result.rows.every((row) => row.status === "active"));
});

test("the owning seller sees their own draft", async () => {
  const result = await withUserContext(seller, (client) =>
    client.query("SELECT id FROM listings WHERE id = $1", [draftId])
  );
  assert.equal(result.rows.length, 1);
});

test("a different seller cannot see or touch another seller's draft", async () => {
  const readResult = await withUserContext(otherSeller, (client) =>
    client.query("SELECT id FROM listings WHERE id = $1", [draftId])
  );
  assert.equal(readResult.rows.length, 0);

  const updateResult = await withUserContext(otherSeller, (client) =>
    client.query("UPDATE listings SET title = 'Hijacked' WHERE id = $1 RETURNING id", [draftId])
  );
  assert.equal(updateResult.rows.length, 0, "RLS must block cross-seller writes even without a matching row");
});
