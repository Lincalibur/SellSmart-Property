// RLS-focused tests for db/migrations/0017, same approach as the rest of
// the suite -- exercises the docusign_webhook policies directly via
// withDocusignWebhookAccess, since there's no way to get a real DocuSign
// account or Connect delivery in CI.
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { withDocusignWebhookAccess, withOtpAccess, withUserContext, pool } from "../db/pool.js";

process.env.NODE_ENV = "test";

const seller = { id: "ds-seller-1", groups: ["seller"] };
const otherSeller = { id: "ds-seller-2", groups: ["seller"] };
const listingId = "13131313-1313-1313-1313-131313131313";
const otpId = randomUUID();
const envelopeId = `envelope-${randomUUID()}`;

before(async () => {
  await withUserContext(seller, (client) =>
    client.query(
      `INSERT INTO listings (id, seller_id, title, type, location, price, status)
       VALUES ($1, $2, 'DocuSign Test Listing', 'House', 'Cape Town', 1000000, 'active')`,
      [listingId, seller.id]
    )
  );
  await withOtpAccess(otpId, (client) =>
    client.query(
      `INSERT INTO otps (id, listing_id, seller_id, buyer_name, buyer_id_number, buyer_contact, buyer_email,
                          offer_price, deposit, occupation_date, status, envelope_id)
       VALUES ($1, $2, $3, 'Buyer One', '8001015800082', '082 555 0100', 'buyer@example.example', 1000000, 100000, '2026-09-01', 'accepted', $4)`,
      [otpId, listingId, seller.id, envelopeId]
    )
  );
});

after(async () => {
  await pool.query("DELETE FROM otps WHERE listing_id = $1", [listingId]);
  await withUserContext(seller, (client) =>
    client.query("DELETE FROM listings WHERE id = $1", [listingId])
  );
  await pool.end();
});

test("docusign_webhook scoped to a DIFFERENT envelope id cannot see or update this otp", async () => {
  const result = await withDocusignWebhookAccess("some-other-envelope", (client) =>
    client.query("SELECT id FROM otps WHERE envelope_id = $1", [envelopeId])
  );
  assert.equal(result.rows.length, 0);
});

test("docusign_webhook scoped to THIS envelope id can look up and update the otp", async () => {
  const result = await withDocusignWebhookAccess(envelopeId, (client) =>
    client.query("UPDATE otps SET signed_by_buyer = true WHERE envelope_id = $1 RETURNING signed_by_buyer", [
      envelopeId,
    ])
  );
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].signed_by_buyer, true);
});

test("docusign_webhook can write an otp_history row cross-checked against the real seller_id", async () => {
  await withDocusignWebhookAccess(envelopeId, (client) =>
    client.query(
      `INSERT INTO otp_history (otp_id, seller_id, event, by_party)
       VALUES ((SELECT id FROM otps WHERE envelope_id = $1), $2, 'Signed by buyer', 'buyer')`,
      [envelopeId, seller.id]
    )
  );
  const history = await withUserContext(seller, (client) =>
    client.query("SELECT event FROM otp_history WHERE otp_id = $1", [otpId])
  );
  assert.equal(history.rows.length, 1);
  assert.equal(history.rows[0].event, "Signed by buyer");
});

test("docusign_webhook cannot write an otp_history row with a mismatched seller_id", async () => {
  await assert.rejects(
    withDocusignWebhookAccess(envelopeId, (client) =>
      client.query(
        `INSERT INTO otp_history (otp_id, seller_id, event, by_party) VALUES ($1, 'someone-else', 'Signed by seller', 'seller')`,
        [otpId]
      )
    )
  );
});

test("a different seller cannot read the otp even knowing its envelope_id status changed", async () => {
  const result = await withUserContext(otherSeller, (client) =>
    client.query("SELECT id FROM otps WHERE id = $1", [otpId])
  );
  assert.equal(result.rows.length, 0);
});
