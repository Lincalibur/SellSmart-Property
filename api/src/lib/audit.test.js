// RLS-focused tests for db/migrations/0022 + logAudit itself. audit_log has
// no admin_full_access-style FOR ALL policy -- it's deliberately immutable
// (see db/README.md) -- so these assert both halves of that: any role can
// append, but only admin can read, and nothing can update/delete.
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { withOtpAccess, withUserContext, pool } from "../db/pool.js";
import { logAudit } from "./audit.js";

process.env.NODE_ENV = "test";

const admin = { id: "audit-admin-1", groups: ["admin"] };
const seller = { id: "audit-seller-1", groups: ["seller"] };
const resourceId = randomUUID();

after(async () => {
  await pool.end();
});

test("logAudit writes a row, visible only to admin", async () => {
  await withUserContext(seller, (client) =>
    logAudit(client, {
      actorType: "seller",
      actorId: seller.id,
      action: "offer.accept",
      resourceType: "otp",
      resourceId,
      ip: "127.0.0.1",
    })
  );

  const asAdmin = await withUserContext(admin, (client) =>
    client.query("SELECT actor_type, action, ip_address FROM audit_log WHERE resource_id = $1", [resourceId])
  );
  assert.equal(asAdmin.rows.length, 1);
  assert.equal(asAdmin.rows[0].action, "offer.accept");
  assert.equal(asAdmin.rows[0].ip_address, "127.0.0.1");

  const asSeller = await withUserContext(seller, (client) =>
    client.query("SELECT id FROM audit_log WHERE resource_id = $1", [resourceId])
  );
  assert.equal(asSeller.rows.length, 0, "only admin has a SELECT policy on audit_log");

  const anonymous = await pool.query("SELECT id FROM audit_log WHERE resource_id = $1", [resourceId]);
  assert.equal(anonymous.rows.length, 0);
});

test("an otp_bearer (no Cognito account) can still append an audit row", async () => {
  const otpBearerResourceId = randomUUID();
  await withOtpAccess(otpBearerResourceId, (client) =>
    logAudit(client, {
      actorType: "buyer",
      actorId: null,
      action: "document.download",
      resourceType: "otp",
      resourceId: otpBearerResourceId,
      ip: "127.0.0.1",
    })
  );
  const asAdmin = await withUserContext(admin, (client) =>
    client.query("SELECT action FROM audit_log WHERE resource_id = $1", [otpBearerResourceId])
  );
  assert.equal(asAdmin.rows.length, 1);
});

test("even admin cannot update or delete an audit_log row", async () => {
  // No UPDATE/DELETE policy at all means FORCE RLS silently matches zero
  // rows, the same as every other RLS-blocked write in this codebase (see
  // otps.test.js's "a different seller cannot update it") -- it doesn't
  // throw.
  const updated = await withUserContext(admin, (client) =>
    client.query("UPDATE audit_log SET action = 'tampered' WHERE resource_id = $1 RETURNING id", [resourceId])
  );
  assert.equal(updated.rows.length, 0, "no UPDATE policy exists on audit_log for any role");

  const deleted = await withUserContext(admin, (client) =>
    client.query("DELETE FROM audit_log WHERE resource_id = $1 RETURNING id", [resourceId])
  );
  assert.equal(deleted.rows.length, 0, "no DELETE policy exists on audit_log for any role");
});

test("a failed transaction rolls back its audit row along with the event it documents", async () => {
  const doomedResourceId = randomUUID();
  await assert.rejects(
    withUserContext(seller, async (client) => {
      await logAudit(client, {
        actorType: "seller",
        actorId: seller.id,
        action: "offer.accept",
        resourceType: "otp",
        resourceId: doomedResourceId,
        ip: "127.0.0.1",
      });
      throw new Error("simulated failure after the audit write");
    })
  );

  const asAdmin = await withUserContext(admin, (client) =>
    client.query("SELECT id FROM audit_log WHERE resource_id = $1", [doomedResourceId])
  );
  assert.equal(asAdmin.rows.length, 0, "the audit row must not survive the rollback");
});
