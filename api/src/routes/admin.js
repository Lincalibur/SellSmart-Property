import express from "express";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { withUserContext } from "../db/pool.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncRoute } from "../middleware/asyncRoute.js";
import { s3, DOCUMENTS_BUCKET } from "../lib/s3.js";
import { addUserToGroup, getUser, listUsers, removeUserFromGroup, ROLE_GROUPS, setUserEnabled } from "../lib/cognito.js";

export const adminRouter = express.Router();
adminRouter.use(requireAuth, requireRole("admin"));

// Back office (MVP-SPEC.md's explicit "out of the mockup, in the real
// service" list, issue #12). Every DB route below relies on the
// admin_full_access policy each table already has (0003/0008/0010/0012/
// 0014) -- this epic is mostly about exposing routes over RLS that was
// already there, not new access control. User management is the one
// genuinely new capability, since Cognito is the user store, not Postgres
// -- see lib/cognito.js.

// -- Users --------------------------------------------------------------

adminRouter.get(
  "/admin/users",
  asyncRoute(async (req, res) => {
    const { limit, nextToken } = req.query;
    res.json(await listUsers({ limit: limit ? Number(limit) : undefined, paginationToken: nextToken }));
  })
);

adminRouter.get(
  "/admin/users/:username",
  asyncRoute(async (req, res) => {
    try {
      res.json(await getUser(req.params.username));
    } catch (err) {
      if (err.name === "UserNotFoundException") {
        return res.status(404).json({ error: "User not found." });
      }
      throw err;
    }
  })
);

adminRouter.post(
  "/admin/users/:username/groups/:groupName",
  asyncRoute(async (req, res) => {
    if (!ROLE_GROUPS.includes(req.params.groupName)) {
      return res.status(400).json({ error: `groupName must be one of: ${ROLE_GROUPS.join(", ")}` });
    }
    await addUserToGroup(req.params.username, req.params.groupName);
    res.status(204).end();
  })
);

adminRouter.delete(
  "/admin/users/:username/groups/:groupName",
  asyncRoute(async (req, res) => {
    await removeUserFromGroup(req.params.username, req.params.groupName);
    res.status(204).end();
  })
);

adminRouter.post(
  "/admin/users/:username/enable",
  asyncRoute(async (req, res) => {
    await setUserEnabled(req.params.username, true);
    res.status(204).end();
  })
);

adminRouter.post(
  "/admin/users/:username/disable",
  asyncRoute(async (req, res) => {
    await setUserEnabled(req.params.username, false);
    res.status(204).end();
  })
);

// -- Listings -------------------------------------------------------------

const LISTING_FIELDS = `
  id, seller_id AS "sellerId", title, type, location, price, status,
  beds, baths, parking, size, created_at AS "createdAt", updated_at AS "updatedAt"
`;

adminRouter.get(
  "/admin/listings",
  asyncRoute(async (req, res) => {
    const { status } = req.query;
    const result = await withUserContext(req.user, (client) =>
      status
        ? client.query(`SELECT ${LISTING_FIELDS} FROM listings WHERE status = $1 ORDER BY created_at DESC`, [status])
        : client.query(`SELECT ${LISTING_FIELDS} FROM listings ORDER BY created_at DESC`)
    );
    res.json(result.rows);
  })
);

const LISTING_UPDATABLE_FIELDS = ["status"];

// A moderation override (e.g. taking a listing down) -- not the seller's
// own edit flow (listings.js), which is why this is a separate route
// rather than reusing that one with a role check bolted on.
adminRouter.patch(
  "/admin/listings/:id",
  asyncRoute(async (req, res) => {
    const patch = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => LISTING_UPDATABLE_FIELDS.includes(key))
    );
    const keys = Object.keys(patch);
    if (keys.length === 0) {
      return res.status(400).json({ error: "No updatable fields provided." });
    }
    const setClauses = keys.map((key, i) => `${key} = $${i + 2}`);
    const result = await withUserContext(req.user, (client) =>
      client.query(
        `UPDATE listings SET ${setClauses.join(", ")}, updated_at = now() WHERE id = $1 RETURNING ${LISTING_FIELDS}`,
        [req.params.id, ...keys.map((key) => patch[key])]
      )
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Listing not found." });
    }
    res.json(result.rows[0]);
  })
);

adminRouter.delete(
  "/admin/listings/:id",
  asyncRoute(async (req, res) => {
    const result = await withUserContext(req.user, (client) =>
      client.query("DELETE FROM listings WHERE id = $1 RETURNING id", [req.params.id])
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Listing not found." });
    }
    res.status(204).end();
  })
);

// -- Payments ---------------------------------------------------------------

const PAYMENT_FIELDS = `
  id, listing_id AS "listingId", seller_id AS "sellerId", package_id AS "packageId",
  amount, status, pf_payment_id AS "pfPaymentId", created_at AS "createdAt", updated_at AS "updatedAt"
`;

adminRouter.get(
  "/admin/payments",
  asyncRoute(async (req, res) => {
    const { status } = req.query;
    const result = await withUserContext(req.user, (client) =>
      status
        ? client.query(`SELECT ${PAYMENT_FIELDS} FROM payments WHERE status = $1 ORDER BY created_at DESC`, [status])
        : client.query(`SELECT ${PAYMENT_FIELDS} FROM payments ORDER BY created_at DESC`)
    );
    res.json(result.rows);
  })
);

const PAYMENT_STATUSES = ["pending", "complete", "failed", "cancelled"];

// Manual reconciliation override (e.g. a support case where an EFT
// cleared but the ITN was missed) -- deliberately separate from the
// PayFast-signature-verified webhook path in payments.js, never the other
// way around.
adminRouter.patch(
  "/admin/payments/:id",
  asyncRoute(async (req, res) => {
    if (!PAYMENT_STATUSES.includes(req.body.status)) {
      return res.status(400).json({ error: `status must be one of: ${PAYMENT_STATUSES.join(", ")}` });
    }
    const result = await withUserContext(req.user, (client) =>
      client.query(
        `UPDATE payments SET status = $2, updated_at = now() WHERE id = $1 RETURNING ${PAYMENT_FIELDS}`,
        [req.params.id, req.body.status]
      )
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Payment not found." });
    }
    res.json(result.rows[0]);
  })
);

// -- Documents (compliance/support oversight) ------------------------------

adminRouter.get(
  "/admin/otps/:id/documents",
  asyncRoute(async (req, res) => {
    const documents = await withUserContext(req.user, (client) =>
      client.query("SELECT doc_type, uploaded_by, uploaded_at, s3_key FROM documents WHERE otp_id = $1", [
        req.params.id,
      ])
    );
    const withUrls = await Promise.all(
      documents.rows.map(async (row) => ({
        docType: row.doc_type,
        uploadedBy: row.uploaded_by,
        uploadedAt: row.uploaded_at,
        downloadUrl: await getSignedUrl(s3, new GetObjectCommand({ Bucket: DOCUMENTS_BUCKET, Key: row.s3_key }), {
          expiresIn: 300,
        }),
      }))
    );
    res.json(withUrls);
  })
);
