// RLS-focused tests for db/migrations/0014 + 0015, same approach as the
// rest of the suite (see otps.test.js) -- exercises the policies directly
// via withUserContext/withPaymentWebhookAccess, since there's no way to
// get a real Cognito token or a real PayFast account in CI.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { withPaymentWebhookAccess, withUserContext, pool } from "../db/pool.js";

process.env.NODE_ENV = "test";

const seller = { id: "pay-seller-1", groups: ["seller"] };
const otherSeller = { id: "pay-seller-2", groups: ["seller"] };
const draftListingId = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
const otherListingId = "ffffffff-ffff-ffff-ffff-ffffffffffff";
let paymentId;

before(async () => {
  await withUserContext(seller, (client) =>
    client.query(
      `INSERT INTO listings (id, seller_id, title, type, location, price, status)
       VALUES ($1, $2, 'Payment Test Listing', 'House', 'Cape Town', 1000000, 'draft')`,
      [draftListingId, seller.id]
    )
  );
  await withUserContext(otherSeller, (client) =>
    client.query(
      `INSERT INTO listings (id, seller_id, title, type, location, price, status)
       VALUES ($1, $2, 'Other Seller Listing', 'House', 'Cape Town', 1000000, 'draft')`,
      [otherListingId, otherSeller.id]
    )
  );
});

after(async () => {
  await pool.query("DELETE FROM payments WHERE listing_id = ANY($1)", [[draftListingId, otherListingId]]);
  await withUserContext(seller, (client) =>
    client.query("DELETE FROM listings WHERE id = $1", [draftListingId])
  );
  await withUserContext(otherSeller, (client) =>
    client.query("DELETE FROM listings WHERE id = $1", [otherListingId])
  );
  await pool.end();
});

test("a seller cannot create a payment against another seller's listing", async () => {
  await assert.rejects(
    withUserContext(seller, (client) =>
      client.query(
        `INSERT INTO payments (listing_id, seller_id, package_id, amount, item_name)
         VALUES ($1, $2, 'starter', 699, 'Starter listing package')`,
        [otherListingId, seller.id]
      )
    )
  );
});

test("a seller can create a payment against their own draft listing", async () => {
  const result = await withUserContext(seller, (client) =>
    client.query(
      `INSERT INTO payments (listing_id, seller_id, package_id, amount, item_name)
       VALUES ($1, $2, 'starter', 699, 'Starter listing package') RETURNING id`,
      [draftListingId, seller.id]
    )
  );
  assert.equal(result.rows.length, 1);
  paymentId = result.rows[0].id;
});

test("a different seller cannot read it", async () => {
  const result = await withUserContext(otherSeller, (client) =>
    client.query("SELECT id FROM payments WHERE id = $1", [paymentId])
  );
  assert.equal(result.rows.length, 0);
});

test("anonymous (no session vars) cannot read payments", async () => {
  const result = await pool.query("SELECT id FROM payments WHERE id = $1", [paymentId]);
  assert.equal(result.rows.length, 0);
});

test("payfast_webhook scoped to a DIFFERENT payment id cannot update this one", async () => {
  const result = await withPaymentWebhookAccess("00000000-0000-0000-0000-000000000000", (client) =>
    client.query("UPDATE payments SET status = 'complete' WHERE id = $1 RETURNING status", [paymentId])
  );
  assert.equal(result.rows.length, 0, "RLS must block writes scoped to a different payment id");
});

test("payfast_webhook scoped to THIS payment id can update it, and (once explicitly scoped to the listing too) activate it", async () => {
  const result = await withPaymentWebhookAccess(paymentId, async (client) => {
    const updated = await client.query(
      "UPDATE payments SET status = 'complete' WHERE id = $1 RETURNING status",
      [paymentId]
    );
    // Mirrors what the route does: it already knows listing_id from the
    // payments row it just read, and sets this explicitly rather than
    // relying on a subquery inside the RLS policy -- see db/migrations/0015.
    await client.query("SELECT set_config('app.current_activatable_listing_id', $1, true)", [draftListingId]);
    const gucCheck = await client.query(
      "SELECT current_setting('app.current_activatable_listing_id', true) AS v, current_setting('app.current_user_role', true) AS r"
    );
    process.stderr.write("DIAG guc: " + JSON.stringify(gucCheck.rows[0]) + " expected=" + draftListingId + "\n");
    const noopUpdate = await client.query("UPDATE listings SET status = status WHERE id = $1 RETURNING status", [
      draftListingId,
    ]);
    process.stderr.write("DIAG no-op update (no status filter) rows: " + noopUpdate.rows.length + "\n");
    const policies = await client.query(
      "SELECT policyname, permissive, cmd, qual, with_check FROM pg_policies WHERE tablename = 'listings' ORDER BY policyname"
    );
    process.stderr.write("DIAG all listings policies: " + JSON.stringify(policies.rows) + "\n");
    const explain = await client.query(
      "EXPLAIN (COSTS OFF) UPDATE listings SET status = status WHERE id = $1",
      [draftListingId]
    );
    process.stderr.write("DIAG explain: " + JSON.stringify(explain.rows) + "\n");
    const listing = await client.query(
      "UPDATE listings SET status = 'active' WHERE id = $1 AND status = 'draft' RETURNING status",
      [draftListingId]
    );
    return { updated, listing };
  });
  assert.equal(result.updated.rows.length, 1);
  assert.equal(result.updated.rows[0].status, "complete");
  assert.equal(result.listing.rows.length, 1, "payfast_webhook must be able to activate the listing it was explicitly scoped to");
  assert.equal(result.listing.rows[0].status, "active");
});

test("payfast_webhook cannot activate a listing it wasn't explicitly scoped to, even mid-session", async () => {
  const result = await withPaymentWebhookAccess(paymentId, async (client) => {
    await client.query("SELECT set_config('app.current_activatable_listing_id', $1, true)", [draftListingId]);
    return client.query("UPDATE listings SET status = 'active' WHERE id = $1 RETURNING status", [otherListingId]);
  });
  assert.equal(result.rows.length, 0, "RLS must scope listing activation to the exact id set, not any listing");
});
