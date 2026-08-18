import express from "express";
import { listingsRouter } from "./routes/listings.js";
import { enquiriesRouter } from "./routes/enquiries.js";
import { viewingsRouter } from "./routes/viewings.js";
import { otpsRouter } from "./routes/otps.js";

export const app = express();
app.use(express.json());

// Matches the ALB target group health check path in terraform/modules/compute.
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// See api/src/routes/listings.js for the auth/RBAC + RLS pattern every
// protected route follows -- copy its shape for later epics.
app.use("/api/listings", listingsRouter);
app.use("/api", enquiriesRouter);
app.use("/api", viewingsRouter);
app.use("/api", otpsRouter);

// Catches anything asyncRoute forwarded via next(err) -- without this,
// Express 4's default error handler still responds, but with no logging
// and (outside NODE_ENV=production) a stack-trace leak.
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong." });
});

const port = process.env.PORT ?? 3000;

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`API listening on port ${port}`);
  });
}
