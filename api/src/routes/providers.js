import express from "express";
import { pool, withUserContext } from "../db/pool.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncRoute } from "../middleware/asyncRoute.js";

export const providersRouter = express.Router();

const PROVIDER_FIELDS = `
  id, name, category, location, blurb, email,
  created_at AS "createdAt", updated_at AS "updatedAt"
`;

const CATEGORIES = [
  "Conveyancers",
  "Bond Originators",
  "Valuators",
  "Contractors",
  "Photographers",
  "Inspectors",
  "Moving Companies",
];

// Marketplace Page (MVP-SPEC.md #6) -- no auth, RLS's public_reads_providers
// policy (0019) is what actually allows this; the query filters explicitly
// so the intent reads clearly next to the policy.
providersRouter.get(
  "/providers",
  asyncRoute(async (req, res) => {
    const { category } = req.query;
    if (category) {
      const result = await pool.query(`SELECT ${PROVIDER_FIELDS} FROM providers WHERE category = $1 ORDER BY name`, [
        category,
      ]);
      return res.json(result.rows);
    }
    const result = await pool.query(`SELECT ${PROVIDER_FIELDS} FROM providers ORDER BY category, name`);
    res.json(result.rows);
  })
);

providersRouter.get(
  "/providers/:id",
  asyncRoute(async (req, res) => {
    const result = await pool.query(`SELECT ${PROVIDER_FIELDS} FROM providers WHERE id = $1`, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Provider not found." });
    }
    res.json(result.rows[0]);
  })
);

// Admin-only management -- no self-service provider signup in this epic
// (see db/migrations/0019's comment); issue #12's admin panel is the
// intended caller once it exists.
providersRouter.post(
  "/providers",
  requireAuth,
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    const { name, category, location, blurb, email } = req.body;
    if (!name || !CATEGORIES.includes(category) || !location || !email) {
      return res.status(400).json({ error: `name, category (one of: ${CATEGORIES.join(", ")}), location and email are required.` });
    }
    const result = await withUserContext(req.user, (client) =>
      client.query(
        `INSERT INTO providers (name, category, location, blurb, email)
         VALUES ($1, $2, $3, $4, $5) RETURNING ${PROVIDER_FIELDS}`,
        [name, category, location, blurb ?? "", email]
      )
    );
    res.status(201).json(result.rows[0]);
  })
);

const UPDATABLE_FIELDS = ["name", "category", "location", "blurb", "email"];

providersRouter.patch(
  "/providers/:id",
  requireAuth,
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    const patch = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => UPDATABLE_FIELDS.includes(key))
    );
    const keys = Object.keys(patch);
    if (keys.length === 0) {
      return res.status(400).json({ error: "No updatable fields provided." });
    }
    if (patch.category && !CATEGORIES.includes(patch.category)) {
      return res.status(400).json({ error: `category must be one of: ${CATEGORIES.join(", ")}` });
    }

    const setClauses = keys.map((key, i) => `${key} = $${i + 2}`);
    const result = await withUserContext(req.user, (client) =>
      client.query(
        `UPDATE providers SET ${setClauses.join(", ")}, updated_at = now()
         WHERE id = $1 RETURNING ${PROVIDER_FIELDS}`,
        [req.params.id, ...keys.map((key) => patch[key])]
      )
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Provider not found." });
    }
    res.json(result.rows[0]);
  })
);

providersRouter.delete(
  "/providers/:id",
  requireAuth,
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    const result = await withUserContext(req.user, (client) =>
      client.query("DELETE FROM providers WHERE id = $1 RETURNING id", [req.params.id])
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Provider not found." });
    }
    res.status(204).end();
  })
);
