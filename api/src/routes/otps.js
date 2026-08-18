import { randomUUID } from "node:crypto";
import express from "express";
import { pool, withOtpAccess, withUserContext } from "../db/pool.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncRoute } from "../middleware/asyncRoute.js";

export const otpsRouter = express.Router();

const OTP_COLUMNS = `
  id, listing_id, buyer_name, buyer_id_number, buyer_contact, offer_price,
  deposit, occupation_date, occupational_rent, bond_amount, fixtures,
  suspensive_conditions, special_conditions, status, counter_price,
  signed_by_buyer, signed_by_seller, created_at, updated_at
`;

// Matches src/context/AppContext.jsx's otp shape (nested `buyer`, not flat
// buyer_* columns) so this can drop straight into the existing frontend
// reducer once epic #7's follow-on wires it up.
function toOtpJson(row) {
  return {
    id: row.id,
    listingId: row.listing_id,
    buyer: { name: row.buyer_name, idNumber: row.buyer_id_number, contact: row.buyer_contact },
    offerPrice: Number(row.offer_price),
    deposit: Number(row.deposit),
    occupationDate: row.occupation_date,
    occupationalRent: row.occupational_rent == null ? null : Number(row.occupational_rent),
    bondAmount: row.bond_amount == null ? null : Number(row.bond_amount),
    fixtures: row.fixtures,
    suspensiveConditions: row.suspensive_conditions,
    specialConditions: row.special_conditions,
    status: row.status,
    counterPrice: row.counter_price == null ? null : Number(row.counter_price),
    signedByBuyer: row.signed_by_buyer,
    signedBySeller: row.signed_by_seller,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toHistoryJson(row) {
  return {
    event: row.event,
    by: row.by_party,
    amount: row.amount == null ? null : Number(row.amount),
    createdAt: row.created_at,
  };
}

async function fetchHistory(client, otpId) {
  const result = await client.query(
    "SELECT event, by_party, amount, created_at FROM otp_history WHERE otp_id = $1 ORDER BY created_at",
    [otpId]
  );
  return result.rows.map(toHistoryJson);
}

// Submit Offer (OTP Builder, MVP-SPEC.md #6) -- no auth, the buyer doesn't
// have an account. The id is generated here (not by the database) so
// withOtpAccess can set app.current_otp_id before the INSERT, which is what
// lets this safely use RETURNING -- see db/README.md's RETURNING/RLS
// gotcha and db/migrations/0010's otp_bearer_creates_otp policy.
otpsRouter.post(
  "/listings/:listingId/otps",
  asyncRoute(async (req, res) => {
    const { buyer, offerPrice, deposit, occupationDate } = req.body;
    if (!buyer?.name || !buyer?.idNumber || !buyer?.contact || !offerPrice || !deposit || !occupationDate) {
      return res.status(400).json({
        error: "buyer (name, idNumber, contact), offerPrice, deposit and occupationDate are required.",
      });
    }

    const listing = await pool.query(
      "SELECT seller_id FROM listings WHERE id = $1 AND status = 'active'",
      [req.params.listingId]
    );
    if (listing.rows.length === 0) {
      return res.status(404).json({ error: "Listing not found." });
    }

    const id = randomUUID();
    const result = await withOtpAccess(id, async (client) => {
      const inserted = await client.query(
        `INSERT INTO otps
           (id, listing_id, seller_id, buyer_name, buyer_id_number, buyer_contact, offer_price,
            deposit, occupation_date, occupational_rent, bond_amount, fixtures,
            suspensive_conditions, special_conditions)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING ${OTP_COLUMNS}`,
        [
          id,
          req.params.listingId,
          listing.rows[0].seller_id,
          buyer.name,
          buyer.idNumber,
          buyer.contact,
          offerPrice,
          deposit,
          occupationDate,
          req.body.occupationalRent ?? null,
          req.body.bondAmount ?? null,
          req.body.fixtures ?? "",
          req.body.suspensiveConditions ?? "",
          req.body.specialConditions ?? "",
        ]
      );
      await client.query(
        `INSERT INTO otp_history (otp_id, seller_id, event, by_party, amount)
         VALUES ($1, $2, 'Offer submitted', 'buyer', $3)`,
        [id, listing.rows[0].seller_id, offerPrice]
      );
      return { ...toOtpJson(inserted.rows[0]), history: await fetchHistory(client, id) };
    });

    res.status(201).json(result);
  })
);

// Offer Management dashboard -- RLS's seller_reads_own_otps policy scopes
// this to the signed-in seller. Registered before GET /otps/:id so
// Express doesn't match "mine" as the :id param.
otpsRouter.get(
  "/otps/mine",
  requireAuth,
  requireRole("seller"),
  asyncRoute(async (req, res) => {
    const result = await withUserContext(req.user, async (client) => {
      const otps = await client.query(`SELECT ${OTP_COLUMNS} FROM otps ORDER BY created_at DESC`);
      return Promise.all(
        otps.rows.map(async (row) => ({ ...toOtpJson(row), history: await fetchHistory(client, row.id) }))
      );
    });
    res.json(result);
  })
);

// Buyer polling their own OTP's status (e.g. the Signing screen) -- same
// "knowing the id proves it's yours" capability model as the POST above.
otpsRouter.get(
  "/otps/:id",
  asyncRoute(async (req, res) => {
    const result = await withOtpAccess(req.params.id, async (client) => {
      const otp = await client.query(`SELECT ${OTP_COLUMNS} FROM otps WHERE id = $1`, [req.params.id]);
      if (otp.rows.length === 0) return null;
      return { ...toOtpJson(otp.rows[0]), history: await fetchHistory(client, req.params.id) };
    });
    if (!result) {
      return res.status(404).json({ error: "Offer not found." });
    }
    res.json(result);
  })
);

// Buyer Accept Counter -- only valid while the seller's counter is pending.
otpsRouter.post(
  "/otps/:id/accept-counter",
  asyncRoute(async (req, res) => {
    const result = await withOtpAccess(req.params.id, async (client) => {
      const current = await client.query("SELECT status, counter_price, seller_id FROM otps WHERE id = $1", [
        req.params.id,
      ]);
      if (current.rows.length === 0) return null;
      if (current.rows[0].status !== "countered") {
        return { error: "No pending counter-offer to accept." };
      }

      const updated = await client.query(
        `UPDATE otps SET status = 'accepted', offer_price = counter_price, updated_at = now()
         WHERE id = $1 RETURNING ${OTP_COLUMNS}`,
        [req.params.id]
      );
      await client.query(
        `INSERT INTO otp_history (otp_id, seller_id, event, by_party, amount)
         VALUES ($1, $2, 'Counter-offer accepted', 'buyer', $3)`,
        [req.params.id, current.rows[0].seller_id, current.rows[0].counter_price]
      );
      return { ...toOtpJson(updated.rows[0]), history: await fetchHistory(client, req.params.id) };
    });

    if (!result) {
      return res.status(404).json({ error: "Offer not found." });
    }
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result);
  })
);

// Sign OTP (buyer side) -- simulated signing (matches MVP-SPEC.md #9:
// "opens e-signature step... simulated in mockup"); real DocuSign
// integration is issue #10.
otpsRouter.post(
  "/otps/:id/sign",
  asyncRoute(async (req, res) => {
    const result = await withOtpAccess(req.params.id, async (client) => {
      const current = await client.query("SELECT status, seller_id FROM otps WHERE id = $1", [req.params.id]);
      if (current.rows.length === 0) return null;
      if (current.rows[0].status !== "accepted") {
        return { error: "The offer must be accepted before it can be signed." };
      }

      const updated = await client.query(
        `UPDATE otps SET signed_by_buyer = true, updated_at = now()
         WHERE id = $1 RETURNING ${OTP_COLUMNS}`,
        [req.params.id]
      );
      await client.query(
        `INSERT INTO otp_history (otp_id, seller_id, event, by_party)
         VALUES ($1, $2, 'Signed by buyer', 'buyer')`,
        [req.params.id, current.rows[0].seller_id]
      );
      return { ...toOtpJson(updated.rows[0]), history: await fetchHistory(client, req.params.id) };
    });

    if (!result) {
      return res.status(404).json({ error: "Offer not found." });
    }
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result);
  })
);

// Accept / Counter / Reject an offer -- RLS's seller_updates_own_otps
// policy is what stops a seller from touching another seller's offer even
// if a bug let a bad ID through here.
otpsRouter.patch(
  "/otps/mine/:id",
  requireAuth,
  requireRole("seller"),
  asyncRoute(async (req, res) => {
    const { decision, counterPrice } = req.body;
    if (!["accept", "counter", "reject"].includes(decision)) {
      return res.status(400).json({ error: "decision must be 'accept', 'counter' or 'reject'." });
    }
    if (decision === "counter" && !counterPrice) {
      return res.status(400).json({ error: "counterPrice is required to counter." });
    }

    const result = await withUserContext(req.user, async (client) => {
      let updated;
      let historyEvent;
      let historyAmount = null;

      if (decision === "accept") {
        updated = await client.query(
          `UPDATE otps SET status = 'accepted', updated_at = now() WHERE id = $1 RETURNING ${OTP_COLUMNS}`,
          [req.params.id]
        );
        historyEvent = "Offer accepted";
      } else if (decision === "reject") {
        updated = await client.query(
          `UPDATE otps SET status = 'rejected', updated_at = now() WHERE id = $1 RETURNING ${OTP_COLUMNS}`,
          [req.params.id]
        );
        historyEvent = "Offer rejected";
      } else {
        updated = await client.query(
          `UPDATE otps SET status = 'countered', counter_price = $2, updated_at = now()
           WHERE id = $1 RETURNING ${OTP_COLUMNS}`,
          [req.params.id, counterPrice]
        );
        historyEvent = "Counter-offer sent";
        historyAmount = counterPrice;
      }

      if (updated.rows.length === 0) return null;

      await client.query(
        `INSERT INTO otp_history (otp_id, seller_id, event, by_party, amount)
         VALUES ($1, $2, $3, 'seller', $4)`,
        [req.params.id, req.user.id, historyEvent, historyAmount]
      );
      return { ...toOtpJson(updated.rows[0]), history: await fetchHistory(client, req.params.id) };
    });

    if (!result) {
      return res.status(404).json({ error: "Offer not found." });
    }
    res.json(result);
  })
);

// Sign OTP (seller side).
otpsRouter.post(
  "/otps/mine/:id/sign",
  requireAuth,
  requireRole("seller"),
  asyncRoute(async (req, res) => {
    const result = await withUserContext(req.user, async (client) => {
      const current = await client.query("SELECT status FROM otps WHERE id = $1", [req.params.id]);
      if (current.rows.length === 0) return null;
      if (current.rows[0].status !== "accepted") {
        return { error: "The offer must be accepted before it can be signed." };
      }

      const updated = await client.query(
        `UPDATE otps SET signed_by_seller = true, updated_at = now()
         WHERE id = $1 RETURNING ${OTP_COLUMNS}`,
        [req.params.id]
      );
      await client.query(
        `INSERT INTO otp_history (otp_id, seller_id, event, by_party)
         VALUES ($1, $2, 'Signed by seller', 'seller')`,
        [req.params.id, req.user.id]
      );
      return { ...toOtpJson(updated.rows[0]), history: await fetchHistory(client, req.params.id) };
    });

    if (!result) {
      return res.status(404).json({ error: "Offer not found." });
    }
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result);
  })
);
