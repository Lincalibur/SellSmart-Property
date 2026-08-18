import express from "express";
import { pool, withUserContext } from "../db/pool.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const listingsRouter = express.Router();

const LISTING_FIELDS = `
  id, seller_id AS "sellerId", title, type, location, price, status,
  beds, baths, parking, size, extras, description, images, views,
  created_at AS "createdAt", updated_at AS "updatedAt"
`;

const MAX_PAGE_SIZE = 50;

function parsePagination(query) {
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), MAX_PAGE_SIZE);
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  return { limit, offset: (page - 1) * limit };
}

// Browse Properties (MVP-SPEC.md #6) -- no auth. Row-Level Security's
// public_reads_active_listings policy (0005) is what actually limits this
// to active listings; the query doesn't need to say WHERE status = 'active'
// itself, but does anyway so the intent reads clearly next to the policy.
listingsRouter.get("/", async (req, res) => {
  const { location, type, minPrice, maxPrice } = req.query;
  const { limit, offset } = parsePagination(req.query);

  const conditions = ["status = 'active'"];
  const params = [];

  if (location) {
    params.push(`%${location}%`);
    conditions.push(`location ILIKE $${params.length}`);
  }
  if (type) {
    params.push(type);
    conditions.push(`type = $${params.length}`);
  }
  if (minPrice) {
    params.push(minPrice);
    conditions.push(`price >= $${params.length}`);
  }
  if (maxPrice) {
    params.push(maxPrice);
    conditions.push(`price <= $${params.length}`);
  }

  params.push(limit, offset);
  const result = await pool.query(
    `SELECT ${LISTING_FIELDS} FROM listings
     WHERE ${conditions.join(" AND ")}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  res.json(result.rows);
});

// Seller Dashboard's own listings, any status -- RLS's seller_owns_listing
// policy scopes this to the signed-in seller.
listingsRouter.get("/mine", requireAuth, requireRole("seller"), async (req, res) => {
  const result = await withUserContext(req.user, (client) =>
    client.query(`SELECT ${LISTING_FIELDS} FROM listings ORDER BY created_at DESC`)
  );
  res.json(result.rows);
});

// Property Detail Page -- no auth, active listings only (same RLS policy
// as the browse route above).
listingsRouter.get("/:id", async (req, res) => {
  const result = await pool.query(
    `SELECT ${LISTING_FIELDS} FROM listings WHERE id = $1 AND status = 'active'`,
    [req.params.id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Listing not found." });
  }
  res.json(result.rows[0]);
});

// Full Listing Creation (MVP-SPEC.md #6, steps 1-5) -- starts life as a
// draft; PATCH moves it to 'active' once the seller publishes.
listingsRouter.post("/", requireAuth, requireRole("seller"), async (req, res) => {
  const { title, type, location, price, beds, baths, parking, size, extras, description, images } =
    req.body;

  if (!title || !type || !location || price == null) {
    return res.status(400).json({ error: "title, type, location and price are required." });
  }

  const result = await withUserContext(req.user, (client) =>
    client.query(
      `INSERT INTO listings
         (seller_id, title, type, location, price, beds, baths, parking, size, extras, description, images)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING ${LISTING_FIELDS}`,
      [
        req.user.id,
        title,
        type,
        location,
        price,
        beds ?? 0,
        baths ?? 0,
        parking ?? 0,
        size ?? 0,
        JSON.stringify(extras ?? []),
        description ?? "",
        JSON.stringify(images ?? []),
      ]
    )
  );
  res.status(201).json(result.rows[0]);
});

const UPDATABLE_FIELDS = [
  "title",
  "type",
  "location",
  "price",
  "status",
  "beds",
  "baths",
  "parking",
  "size",
  "extras",
  "description",
  "images",
];

// Covers editing a draft and publishing it (status -> 'active') -- RLS's
// seller_owns_listing WITH CHECK stops a seller from touching anyone else's
// row even if a bug let a bad ID through here.
listingsRouter.patch("/:id", requireAuth, requireRole("seller"), async (req, res) => {
  const patch = Object.fromEntries(
    Object.entries(req.body).filter(([key]) => UPDATABLE_FIELDS.includes(key))
  );
  const keys = Object.keys(patch);
  if (keys.length === 0) {
    return res.status(400).json({ error: "No updatable fields provided." });
  }

  const setClauses = keys.map((key, i) => `${key} = $${i + 2}`);
  const values = keys.map((key) =>
    key === "extras" || key === "images" ? JSON.stringify(patch[key]) : patch[key]
  );

  const result = await withUserContext(req.user, (client) =>
    client.query(
      `UPDATE listings SET ${setClauses.join(", ")}, updated_at = now()
       WHERE id = $1
       RETURNING ${LISTING_FIELDS}`,
      [req.params.id, ...values]
    )
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Listing not found." });
  }
  res.json(result.rows[0]);
});

listingsRouter.delete("/:id", requireAuth, requireRole("seller"), async (req, res) => {
  const result = await withUserContext(req.user, (client) =>
    client.query("DELETE FROM listings WHERE id = $1 RETURNING id", [req.params.id])
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Listing not found." });
  }
  res.status(204).end();
});
