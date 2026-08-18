import express from "express";
import { pool, withUserContext } from "../db/pool.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const enquiriesRouter = express.Router();

const ENQUIRY_FIELDS = `
  id, listing_id AS "listingId", name, email, phone, message,
  created_at AS "createdAt"
`;

// Send Enquiry (MVP-SPEC.md #6) -- no auth, the buyer doesn't have an
// account at this point. db/migrations/0008's public_creates_enquiry
// policy is the real gate on which listing this can target.
enquiriesRouter.post("/listings/:listingId/enquiries", async (req, res) => {
  const { name, email, phone, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: "name, email and message are required." });
  }

  const listing = await pool.query("SELECT seller_id FROM listings WHERE id = $1 AND status = 'active'", [
    req.params.listingId,
  ]);
  if (listing.rows.length === 0) {
    return res.status(404).json({ error: "Listing not found." });
  }

  const result = await pool.query(
    `INSERT INTO enquiries (listing_id, seller_id, name, email, phone, message)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${ENQUIRY_FIELDS}`,
    [req.params.listingId, listing.rows[0].seller_id, name, email, phone ?? "", message]
  );
  res.status(201).json(result.rows[0]);
});

// Enquiries Inbox -- RLS's seller_reads_own_enquiries policy scopes this
// to the signed-in seller.
enquiriesRouter.get("/enquiries/mine", requireAuth, requireRole("seller"), async (req, res) => {
  const result = await withUserContext(req.user, (client) =>
    client.query(`SELECT ${ENQUIRY_FIELDS} FROM enquiries ORDER BY created_at DESC`)
  );
  res.json(result.rows);
});
