import { randomUUID } from "node:crypto";
import express from "express";
import { pool, withUserContext } from "../db/pool.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncRoute } from "../middleware/asyncRoute.js";
import { notifyNewEnquiry } from "../lib/notify.js";

export const enquiriesRouter = express.Router();

const ENQUIRY_FIELDS = `
  id, listing_id AS "listingId", name, email, phone, message,
  created_at AS "createdAt"
`;

// Send Enquiry (MVP-SPEC.md #6) -- no auth, the buyer doesn't have an
// account at this point. db/migrations/0008's public_creates_enquiry
// policy is the real gate on which listing this can target.
//
// No RETURNING here: Postgres filters a RETURNING clause through the
// table's SELECT policies too, and no SELECT policy grants an
// unauthenticated request visibility into the row it just inserted (only
// the owning seller or an admin can read enquiries) -- RETURNING would
// fail with "new row violates row-level security policy" even though the
// INSERT itself is allowed. The id/createdAt are generated here instead.
enquiriesRouter.post(
  "/listings/:listingId/enquiries",
  asyncRoute(async (req, res) => {
    const { name, email, phone, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: "name, email and message are required." });
    }

    const listing = await pool.query(
      "SELECT seller_id, title FROM listings WHERE id = $1 AND status = 'active'",
      [req.params.listingId]
    );
    if (listing.rows.length === 0) {
      return res.status(404).json({ error: "Listing not found." });
    }

    const id = randomUUID();
    const createdAt = new Date().toISOString();
    await pool.query(
      `INSERT INTO enquiries (id, listing_id, seller_id, name, email, phone, message, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, req.params.listingId, listing.rows[0].seller_id, name, email, phone ?? "", message, createdAt]
    );

    // Not awaited: a side effect of an already-successful write, never
    // worth delaying the response for (notify.js never rejects anyway).
    notifyNewEnquiry({
      sellerId: listing.rows[0].seller_id,
      listingTitle: listing.rows[0].title,
      name,
      message,
    });

    res.status(201).json({
      id,
      listingId: req.params.listingId,
      name,
      email,
      phone: phone ?? "",
      message,
      createdAt,
    });
  })
);

// Enquiries Inbox -- RLS's seller_reads_own_enquiries policy scopes this
// to the signed-in seller.
enquiriesRouter.get(
  "/enquiries/mine",
  requireAuth,
  requireRole("seller"),
  asyncRoute(async (req, res) => {
    const result = await withUserContext(req.user, (client) =>
      client.query(`SELECT ${ENQUIRY_FIELDS} FROM enquiries ORDER BY created_at DESC`)
    );
    res.json(result.rows);
  })
);
