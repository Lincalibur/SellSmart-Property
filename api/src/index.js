import express from "express";
import { listingsRouter } from "./routes/listings.js";
import { enquiriesRouter } from "./routes/enquiries.js";
import { viewingsRouter } from "./routes/viewings.js";
import { otpsRouter } from "./routes/otps.js";
import { documentsRouter } from "./routes/documents.js";
import { paymentsRouter } from "./routes/payments.js";
import { docusignRouter, docusignWebhookRouter } from "./routes/docusign.js";
import { providersRouter } from "./routes/providers.js";
import { conveyancerRouter } from "./routes/conveyancer.js";

export const app = express();

// Mounted before express.json(): DocuSign Connect's webhook needs the raw
// request body (its HMAC signature is over the exact bytes sent, see
// routes/docusign.js), and it sends Content-Type: application/json, so
// express.json() below would otherwise consume it first.
app.use("/api", docusignWebhookRouter);

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
app.use("/api", documentsRouter);
app.use("/api", paymentsRouter);
app.use("/api", docusignRouter);
app.use("/api", providersRouter);
app.use("/api", conveyancerRouter);

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
