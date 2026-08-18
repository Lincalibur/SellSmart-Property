// RLS-focused tests for db/migrations/0019, same approach as the rest of
// the suite. providers is the first table with a genuinely unconditional
// public SELECT policy (USING (true)) -- see that migration's comment for
// why that's safe here and nowhere else in this schema.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { withUserContext, pool } from "../db/pool.js";

process.env.NODE_ENV = "test";

const admin = { id: "admin-1", groups: ["admin"] };
const seller = { id: "provider-test-seller-1", groups: ["seller"] };
let providerId;

after(async () => {
  if (providerId) {
    await withUserContext(admin, (client) => client.query("DELETE FROM providers WHERE id = $1", [providerId]));
  }
  await pool.end();
});

test("anonymous (no session vars) can read providers -- the seeded catalog from 0018 is visible", async () => {
  const result = await pool.query("SELECT name FROM providers ORDER BY name LIMIT 1");
  assert.equal(result.rows.length, 1);
});

test("a seller cannot create a provider", async () => {
  await assert.rejects(
    withUserContext(seller, (client) =>
      client.query(
        "INSERT INTO providers (name, category, location, email) VALUES ('Rogue Attorneys', 'Conveyancers', 'Cape Town', 'x@example.example')"
      )
    )
  );
});

test("an admin can create, read and delete a provider", async () => {
  const inserted = await withUserContext(admin, (client) =>
    client.query(
      `INSERT INTO providers (name, category, location, email)
       VALUES ('Test Conveyancers', 'Conveyancers', 'Cape Town', 'test@example.example')
       RETURNING id`
    )
  );
  providerId = inserted.rows[0].id;

  const anon = await pool.query("SELECT name FROM providers WHERE id = $1", [providerId]);
  assert.equal(anon.rows[0].name, "Test Conveyancers");

  const deleted = await withUserContext(admin, (client) =>
    client.query("DELETE FROM providers WHERE id = $1 RETURNING id", [providerId])
  );
  assert.equal(deleted.rows.length, 1);
  providerId = null;
});
