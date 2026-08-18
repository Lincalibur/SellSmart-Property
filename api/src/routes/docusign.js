import express from "express";
import { withDocusignWebhookAccess, withOtpAccess, withUserContext } from "../db/pool.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncRoute } from "../middleware/asyncRoute.js";
import { createEnvelope, createRecipientView, verifyConnectSignature } from "../lib/docusign.js";
import { getUser } from "../lib/cognito.js";
import { notifyOtpSigned } from "../lib/notify.js";
import { logAudit } from "../lib/audit.js";

export const docusignRouter = express.Router();

const OTP_ROW_FIELDS = `
  id, buyer_name, buyer_id_number, buyer_contact, buyer_email, offer_price,
  deposit, occupation_date, suspensive_conditions, special_conditions,
  status, envelope_id
`;

function toOtpRow(row) {
  return {
    buyerName: row.buyer_name,
    buyerIdNumber: row.buyer_id_number,
    offerPrice: row.offer_price,
    deposit: row.deposit,
    occupationDate: row.occupation_date,
    suspensiveConditions: row.suspensive_conditions,
    specialConditions: row.special_conditions,
  };
}

// Sign OTP (MVP-SPEC.md #6) -- creates the DocuSign envelope once an offer
// has been accepted, with both parties as *embedded* signers (see
// lib/docusign.js's clientUserId comment). Only the seller triggers this
// (matches the offer-management flow: the seller has just accepted, so
// they're the one moving the deal to signing) -- the buyer's own signing
// access comes from the /otps/:id/signing-url route below, same
// otp_bearer capability as everywhere else in this table.
//
// Neither party's email/name is trusted from the request body: the
// buyer's (issue #13's otps.buyer_email, db/migrations/0021) was captured
// at OTP submission time, and the seller's comes from Cognito (the actual
// signed-in user), not whatever the client claims.
docusignRouter.post(
  "/otps/mine/:id/envelope",
  requireAuth,
  requireRole("seller"),
  asyncRoute(async (req, res) => {
    const result = await withUserContext(req.user, async (client) => {
      const current = await client.query(`SELECT ${OTP_ROW_FIELDS} FROM otps WHERE id = $1`, [req.params.id]);
      if (current.rows.length === 0) return { notFound: true };
      if (current.rows[0].status !== "accepted") return { notAccepted: true };
      if (current.rows[0].envelope_id) return { alreadyCreated: true };
      return { otp: current.rows[0] };
    });

    if (result.notFound) return res.status(404).json({ error: "Offer not found." });
    if (result.notAccepted) return res.status(409).json({ error: "The offer must be accepted before signing." });
    if (result.alreadyCreated) return res.status(409).json({ error: "An envelope already exists for this offer." });

    const seller = await getUser(req.user.id);
    if (!seller?.email) {
      return res.status(409).json({ error: "Your account has no email on file." });
    }

    const envelopeId = await createEnvelope(toOtpRow(result.otp), {
      buyerEmail: result.otp.buyer_email,
      sellerEmail: seller.email,
      sellerName: seller.name ?? seller.email,
    });

    await withUserContext(req.user, (client) =>
      client.query("UPDATE otps SET envelope_id = $2 WHERE id = $1", [req.params.id, envelopeId])
    );
    res.status(201).json({ envelopeId });
  })
);

// name/email must match what createEnvelope registered the recipient
// with -- resolved the same server-side way for both parties (DB for the
// buyer, Cognito for the seller) rather than trusted from a query param.
async function handleSigningUrl(req, res, runInContext, clientUserId, name, email) {
  const { returnUrl } = req.query;
  if (!returnUrl) {
    return res.status(400).json({ error: "returnUrl query param is required." });
  }

  const otp = await runInContext((client) =>
    client.query("SELECT envelope_id FROM otps WHERE id = $1", [req.params.id])
  );
  if (otp.rows.length === 0) {
    return res.status(404).json({ error: "Offer not found." });
  }
  if (!otp.rows[0].envelope_id) {
    return res.status(409).json({ error: "No envelope has been created for this offer yet." });
  }

  const signingUrl = await createRecipientView(otp.rows[0].envelope_id, { clientUserId, name, email, returnUrl });
  res.json({ signingUrl });
}

// Buyer side -- otp_bearer capability, same as everywhere else in this table.
docusignRouter.get(
  "/otps/:id/signing-url",
  asyncRoute(async (req, res) => {
    const otp = await withOtpAccess(req.params.id, (client) =>
      client.query("SELECT buyer_name, buyer_email FROM otps WHERE id = $1", [req.params.id])
    );
    if (otp.rows.length === 0) {
      return res.status(404).json({ error: "Offer not found." });
    }
    return handleSigningUrl(
      req,
      res,
      (fn) => withOtpAccess(req.params.id, fn),
      "buyer",
      otp.rows[0].buyer_name,
      otp.rows[0].buyer_email
    );
  })
);

// Seller side.
docusignRouter.get(
  "/otps/mine/:id/signing-url",
  requireAuth,
  requireRole("seller"),
  asyncRoute(async (req, res) => {
    const seller = await getUser(req.user.id);
    if (!seller?.email) {
      return res.status(409).json({ error: "Your account has no email on file." });
    }
    return handleSigningUrl(
      req,
      res,
      (fn) => withUserContext(req.user, fn),
      "seller",
      seller.name ?? seller.email,
      seller.email
    );
  })
);

// DocuSign Connect's completion webhook -- calls in with no Cognito token,
// authenticated by an HMAC signature over the *raw* body (see
// lib/docusign.js's verifyConnectSignature). Reads the standard "aggregate"
// Connect payload shape (envelopeId + recipients.signers[], each tagged
// with the clientUserId createEnvelope assigned).
//
// Separate router, mounted in index.js *before* the global
// express.json() -- DocuSign sends Content-Type: application/json, so if
// express.json() ran first it would consume and parse the body, leaving
// nothing for express.raw() below to capture. (Unlike PayFast's ITN
// webhook, which happens to use a different content-type and so never hit
// this problem.) The signature covers the exact raw bytes DocuSign sent;
// re-serializing a parsed-then-reserialized body would not reliably match.
export const docusignWebhookRouter = express.Router();

docusignWebhookRouter.post(
  "/webhooks/docusign/connect",
  express.raw({ type: "application/json" }),
  asyncRoute(async (req, res) => {
    const signature = req.get("X-DocuSign-Signature-1");
    if (!verifyConnectSignature(req.body, signature, process.env.DOCUSIGN_CONNECT_HMAC_KEY)) {
      return res.status(400).json({ error: "Invalid signature." });
    }

    const payload = JSON.parse(req.body.toString("utf8"));
    const envelopeId = payload?.data?.envelopeId;
    const signers = payload?.data?.envelopeSummary?.recipients?.signers ?? [];
    if (!envelopeId) {
      return res.status(400).json({ error: "envelopeId is required." });
    }

    const result = await withDocusignWebhookAccess(envelopeId, async (client) => {
      const current = await client.query(
        "SELECT id, seller_id, buyer_email, signed_by_buyer, signed_by_seller FROM otps WHERE envelope_id = $1",
        [envelopeId]
      );
      if (current.rows.length === 0) return { notFound: true };
      const otp = current.rows[0];
      const signedParties = [];

      for (const signer of signers) {
        if (signer.status !== "completed") continue;
        const party = signer.clientUserId === "buyer" ? "buyer" : signer.clientUserId === "seller" ? "seller" : null;
        if (!party) continue;
        const column = party === "buyer" ? "signed_by_buyer" : "signed_by_seller";
        if (otp[column]) continue; // already recorded -- idempotent against duplicate Connect retries

        await client.query(`UPDATE otps SET ${column} = true, updated_at = now() WHERE id = $1`, [otp.id]);
        await client.query(
          `INSERT INTO otp_history (otp_id, seller_id, event, by_party) VALUES ($1, $2, $3, $4)`,
          [otp.id, otp.seller_id, `Signed by ${party}`, party]
        );
        // req.ip here is DocuSign Connect's own server, not the signer's --
        // the same limitation applies to any webhook-driven audit entry,
        // since the signer's browser never talks to this API directly.
        await logAudit(client, {
          actorType: party,
          actorId: party === "buyer" ? otp.buyer_email : otp.seller_id,
          action: "offer.signed",
          resourceType: "otp",
          resourceId: otp.id,
          ip: req.ip,
          metadata: { envelopeId },
        });
        signedParties.push(party);
      }
      return { ok: true, sellerId: otp.seller_id, buyerEmail: otp.buyer_email, signedParties };
    });

    if (result.notFound) {
      return res.status(404).json({ error: "Unknown envelope." });
    }
    // Not awaited -- see the comment in enquiries.js's POST route. Fine
    // to fire all of them without waiting; PayFast/DocuSign don't need
    // the response any faster than usual, but there's no reason to make
    // them wait on an email send either.
    for (const signedBy of result.signedParties) {
      notifyOtpSigned({ sellerId: result.sellerId, buyerEmail: result.buyerEmail, signedBy });
    }
    res.status(200).send("OK");
  })
);
