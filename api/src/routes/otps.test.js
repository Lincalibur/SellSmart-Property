// Same approach as listings.test.js / enquiries.test.js: exercises the RLS
// policies in db/migrations/0010 directly, since there's no way to get a
// real Cognito token in CI. This file focuses on the new "otp_bearer"
// capability role (see api/src/db/pool.js's withOtpAccess) -- knowing an
// OTP's uuid is what proves it's the buyer's, so the interesting cases are
// about that id, not a session-var identity.
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { withOtpAccess, withUserContext, pool } from "../db/pool.js";

process.env.NODE_ENV = "test";

const seller = { id: "otp-seller-1", groups: ["seller"] };
const otherSeller = { id: "otp-seller-2", groups: ["seller"] };
const listingId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const otpId = randomUUID();
const otherOtpId = randomUUID();

async function insertOtp(id) {
  return withOtpAccess(id, (client) =>
    client.query(
      `INSERT INTO otps (id, listing_id, seller_id, buyer_name, buyer_id_number, buyer_contact, buyer_email,
                          offer_price, deposit, occupation_date)
       VALUES ($1, $2, $3, 'Buyer One', '8001015800082', '082 555 0100', 'buyer@example.example', 1000000, 100000, '2026-09-01')`,
      [id, listingId, seller.id]
    )
  );
}

before(async () => {
  await withUserContext(seller, (client) =>
    client.query(
      `INSERT INTO listings (id, seller_id, title, type, location, price, status)
       VALUES ($1, $2, 'OTP Test Listing', 'House', 'Cape Town', 1000000, 'active')`,
      [listingId, seller.id]
    )
  );
  await insertOtp(otpId);
});

after(async () => {
  await pool.query("DELETE FROM otps WHERE listing_id = $1", [listingId]);
  await withUserContext(seller, (client) =>
    client.query("DELETE FROM listings WHERE id = $1", [listingId])
  );
  await pool.end();
});

test("otp_bearer insert with a mismatched seller_id is rejected", async () => {
  await assert.rejects(
    withOtpAccess(otherOtpId, (client) =>
      client.query(
        `INSERT INTO otps (id, listing_id, seller_id, buyer_name, buyer_id_number, buyer_contact, buyer_email,
                            offer_price, deposit, occupation_date)
         VALUES ($1, $2, 'someone-else', 'x', 'x', 'x', 'x@example.example', 1000000, 100000, '2026-09-01')`,
        [otherOtpId, listingId]
      )
    )
  );
});

test("the otp_bearer for this id can read it", async () => {
  const result = await withOtpAccess(otpId, (client) => client.query("SELECT id FROM otps WHERE id = $1", [otpId]));
  assert.equal(result.rows.length, 1);
});

test("a DIFFERENT otp_bearer (knows a different id) cannot read this one", async () => {
  const result = await withOtpAccess(otherOtpId, (client) => client.query("SELECT id FROM otps WHERE id = $1", [otpId]));
  assert.equal(result.rows.length, 0);
});

test("anonymous (no session vars) cannot read otps", async () => {
  const result = await pool.query("SELECT id FROM otps WHERE id = $1", [otpId]);
  assert.equal(result.rows.length, 0);
});

test("the owning seller can read and update it", async () => {
  const result = await withUserContext(seller, (client) =>
    client.query("UPDATE otps SET status = 'accepted' WHERE id = $1 RETURNING status", [otpId])
  );
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].status, "accepted");
});

test("a different seller cannot update it", async () => {
  const result = await withUserContext(otherSeller, (client) =>
    client.query("UPDATE otps SET status = 'rejected' WHERE id = $1 RETURNING status", [otpId])
  );
  assert.equal(result.rows.length, 0, "RLS must block cross-seller writes");
});

test("the otp_bearer for this id can also update it (e.g. accept a counter)", async () => {
  const result = await withOtpAccess(otpId, (client) =>
    client.query("UPDATE otps SET signed_by_buyer = true WHERE id = $1 RETURNING signed_by_buyer", [otpId])
  );
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].signed_by_buyer, true);
});

test("otp_history: otp_bearer insert with a mismatched seller_id is rejected", async () => {
  await assert.rejects(
    withOtpAccess(otpId, (client) =>
      client.query(
        `INSERT INTO otp_history (otp_id, seller_id, event, by_party) VALUES ($1, 'someone-else', 'x', 'buyer')`,
        [otpId]
      )
    )
  );
});

test("otp_history: the owning seller can read history the otp_bearer wrote", async () => {
  await withOtpAccess(otpId, (client) =>
    client.query(
      `INSERT INTO otp_history (otp_id, seller_id, event, by_party) VALUES ($1, $2, 'Offer submitted', 'buyer')`,
      [otpId, seller.id]
    )
  );
  const result = await withUserContext(seller, (client) =>
    client.query("SELECT event FROM otp_history WHERE otp_id = $1", [otpId])
  );
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].event, "Offer submitted");
});
