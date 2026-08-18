import express from "express";
import { withPaymentWebhookAccess, withUserContext } from "../db/pool.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncRoute } from "../middleware/asyncRoute.js";
import { buildCheckoutFields, payfastSignature, PAYFAST_CHECKOUT_URL } from "../lib/payfast.js";

export const paymentsRouter = express.Router();

// Prices, not persisted server-side elsewhere -- mirrors src/data/seed.js's
// PACKAGES. The API is the source of truth for what a seller is actually
// charged; never trust a price from the request body. Keep in sync.
const PACKAGES = {
  starter: { name: "Starter", price: 699 },
  smart: { name: "Smart", price: 1499 },
  pro: { name: "Pro", price: 2999 },
};

const PAYMENT_FIELDS = "id, listing_id AS \"listingId\", package_id AS \"packageId\", amount, status, created_at AS \"createdAt\", updated_at AS \"updatedAt\"";

// Activate your listing (MVP-SPEC.md #6 "Payment Screen") -- creates a
// pending payment row and hands back the PayFast hosted-checkout fields;
// the frontend auto-submits them as a form POST to PAYFAST_CHECKOUT_URL.
paymentsRouter.post(
  "/listings/:id/checkout",
  requireAuth,
  requireRole("seller"),
  asyncRoute(async (req, res) => {
    const pkg = PACKAGES[req.body.packageId];
    if (!pkg) {
      return res.status(400).json({ error: `packageId must be one of: ${Object.keys(PACKAGES).join(", ")}` });
    }
    if (!req.body.returnUrl || !req.body.cancelUrl || !req.body.notifyUrl) {
      return res.status(400).json({ error: "returnUrl, cancelUrl and notifyUrl are required." });
    }

    const payment = await withUserContext(req.user, async (client) => {
      // Checked here, not just relied on via the RLS WITH CHECK backstop
      // (db/migrations/0014) -- a failed WITH CHECK raises an error rather
      // than returning zero rows, which would surface as a 500 instead of
      // a proper 404/409.
      const listing = await client.query("SELECT status FROM listings WHERE id = $1", [req.params.id]);
      if (listing.rows.length === 0) {
        return { notFound: true };
      }
      if (listing.rows[0].status !== "draft") {
        return { notDraft: true };
      }

      const inserted = await client.query(
        `INSERT INTO payments (listing_id, seller_id, package_id, amount, item_name)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING ${PAYMENT_FIELDS}`,
        [req.params.id, req.user.id, req.body.packageId, pkg.price, `${pkg.name} listing package`]
      );
      return { row: inserted.rows[0] };
    });

    if (payment.notFound) {
      return res.status(404).json({ error: "Listing not found." });
    }
    if (payment.notDraft) {
      return res.status(409).json({ error: "This listing has already been paid for or isn't in draft status." });
    }

    const fields = buildCheckoutFields({
      paymentId: payment.row.id,
      amount: pkg.price,
      itemName: `${pkg.name} listing package`,
      returnUrl: req.body.returnUrl,
      cancelUrl: req.body.cancelUrl,
      notifyUrl: req.body.notifyUrl,
    });

    res.status(201).json({ payment: payment.row, checkoutUrl: PAYFAST_CHECKOUT_URL, fields });
  })
);

paymentsRouter.get(
  "/payments/mine",
  requireAuth,
  requireRole("seller"),
  asyncRoute(async (req, res) => {
    const result = await withUserContext(req.user, (client) =>
      client.query(`SELECT ${PAYMENT_FIELDS} FROM payments ORDER BY created_at DESC`)
    );
    res.json(result.rows);
  })
);

// PayFast's ITN webhook -- calls in from PayFast's own servers with no
// Cognito token, application/x-www-form-urlencoded (not JSON). Verified by
// recomputing the signature over the payload exactly as PayFast built it
// (field order = the order they sent, per payfastSignature's contract),
// never by trusting payment_status alone.
paymentsRouter.post(
  "/webhooks/payfast/itn",
  express.urlencoded({ extended: false }),
  asyncRoute(async (req, res) => {
    const { signature, ...fields } = req.body;
    if (!signature || payfastSignature(fields) !== signature) {
      return res.status(400).json({ error: "Invalid signature." });
    }

    const paymentId = fields.m_payment_id;
    if (!paymentId) {
      return res.status(400).json({ error: "m_payment_id is required." });
    }

    const result = await withPaymentWebhookAccess(paymentId, async (client) => {
      const current = await client.query("SELECT amount, status, listing_id FROM payments WHERE id = $1", [
        paymentId,
      ]);
      if (current.rows.length === 0) {
        return { notFound: true };
      }
      // Idempotent: PayFast can send the same ITN more than once.
      if (current.rows[0].status !== "pending") {
        return { alreadyProcessed: true };
      }
      // Never trust the ITN's amount for anything but a sanity check --
      // the amount actually charged is whatever this API told PayFast to
      // charge at checkout time.
      const expected = Number(current.rows[0].amount).toFixed(2);
      if (fields.amount_gross && fields.amount_gross !== expected) {
        return { amountMismatch: true };
      }

      const status =
        fields.payment_status === "COMPLETE"
          ? "complete"
          : fields.payment_status === "CANCELLED"
            ? "cancelled"
            : "failed";

      await client.query(
        "UPDATE payments SET status = $2, pf_payment_id = $3, updated_at = now() WHERE id = $1",
        [paymentId, status, fields.pf_payment_id ?? null]
      );
      if (status === "complete") {
        await client.query(
          "UPDATE listings SET status = 'active', updated_at = now() WHERE id = $1 AND status = 'draft'",
          [current.rows[0].listing_id]
        );
      }
      return { status };
    });

    if (result.notFound) {
      return res.status(404).json({ error: "Unknown payment." });
    }
    if (result.amountMismatch) {
      return res.status(400).json({ error: "Amount mismatch." });
    }
    res.status(200).send("OK");
  })
);
