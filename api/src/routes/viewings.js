import express from "express";
import { pool, withUserContext } from "../db/pool.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const viewingsRouter = express.Router();

const VIEWING_FIELDS = `
  id, listing_id AS "listingId", name, email, phone,
  requested_date AS "requestedDate", requested_time AS "requestedTime",
  proposed_date AS "proposedDate", proposed_time AS "proposedTime",
  status, created_at AS "createdAt", updated_at AS "updatedAt"
`;

// Request Viewing (MVP-SPEC.md #6) -- no auth, same shape as
// POST /api/listings/:listingId/enquiries.
viewingsRouter.post("/listings/:listingId/viewings", async (req, res) => {
  const { name, email, phone, date, time } = req.body;
  if (!name || !email || !date || !time) {
    return res.status(400).json({ error: "name, email, date and time are required." });
  }

  const listing = await pool.query("SELECT seller_id FROM listings WHERE id = $1 AND status = 'active'", [
    req.params.listingId,
  ]);
  if (listing.rows.length === 0) {
    return res.status(404).json({ error: "Listing not found." });
  }

  const result = await pool.query(
    `INSERT INTO viewing_requests (listing_id, seller_id, name, email, phone, requested_date, requested_time)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${VIEWING_FIELDS}`,
    [req.params.listingId, listing.rows[0].seller_id, name, email, phone ?? "", date, time]
  );
  res.status(201).json(result.rows[0]);
});

// Viewing Requests dashboard page -- RLS's seller_reads_own_viewing_requests
// policy scopes this to the signed-in seller.
viewingsRouter.get("/viewings/mine", requireAuth, requireRole("seller"), async (req, res) => {
  const result = await withUserContext(req.user, (client) =>
    client.query(`SELECT ${VIEWING_FIELDS} FROM viewing_requests ORDER BY created_at DESC`)
  );
  res.json(result.rows);
});

// Accept ({ status: "accepted" }) or Suggest New Time
// ({ status: "rescheduled", proposedDate, proposedTime }) -- RLS's
// seller_updates_own_viewing_requests policy is what stops a seller from
// touching another seller's row even if a bug let a bad ID through here.
viewingsRouter.patch("/viewings/:id", requireAuth, requireRole("seller"), async (req, res) => {
  const { status, proposedDate, proposedTime } = req.body;
  if (!["accepted", "rescheduled"].includes(status)) {
    return res.status(400).json({ error: "status must be 'accepted' or 'rescheduled'." });
  }
  if (status === "rescheduled" && (!proposedDate || !proposedTime)) {
    return res.status(400).json({ error: "proposedDate and proposedTime are required to reschedule." });
  }

  const result = await withUserContext(req.user, (client) =>
    client.query(
      `UPDATE viewing_requests
       SET status = $2, proposed_date = $3, proposed_time = $4, updated_at = now()
       WHERE id = $1
       RETURNING ${VIEWING_FIELDS}`,
      [req.params.id, status, proposedDate ?? null, proposedTime ?? null]
    )
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Viewing request not found." });
  }
  res.json(result.rows[0]);
});
