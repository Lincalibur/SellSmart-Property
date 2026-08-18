import express from "express";
import { requireAuth, requireRole } from "./middleware/auth.js";
import { withUserContext } from "./db/pool.js";

export const app = express();
app.use(express.json());

// Matches the ALB target group health check path in terraform/modules/compute.
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Reference implementation of the auth/RBAC pattern later epics build on:
// verify the token, scope every query to the signed-in user via RLS
// (never trust a role check alone -- the database enforces it too), return
// only what the policy in db/migrations/0003_listings_rls.sql allows through.
app.get("/api/listings/mine", requireAuth, requireRole("seller"), async (req, res) => {
  const listings = await withUserContext(req.user, (client) =>
    client.query("SELECT id, title, price, status FROM listings ORDER BY created_at DESC")
  );
  res.json(listings.rows);
});

const port = process.env.PORT ?? 3000;

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`API listening on port ${port}`);
  });
}
