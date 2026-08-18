import express from "express";
import { listingsRouter } from "./routes/listings.js";

export const app = express();
app.use(express.json());

// Matches the ALB target group health check path in terraform/modules/compute.
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// See api/src/routes/listings.js for the auth/RBAC + RLS pattern every
// protected route follows -- copy its shape for later epics.
app.use("/api/listings", listingsRouter);

const port = process.env.PORT ?? 3000;

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`API listening on port ${port}`);
  });
}
