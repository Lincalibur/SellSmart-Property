import express from "express";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { withUserContext } from "../db/pool.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncRoute } from "../middleware/asyncRoute.js";
import { s3, DOCUMENTS_BUCKET } from "../lib/s3.js";
import { sendEmail } from "../lib/email.js";

export const conveyancerRouter = express.Router();

// A human reads this email at their own pace, unlike documents.js's list
// endpoint (which a browser fetches and uses right away) -- 5 minutes
// would routinely expire before anyone clicks. A week is generous enough
// to cover normal handoff turnaround without leaving links live forever.
const DOCUMENT_LINK_TTL_SECONDS = 7 * 24 * 60 * 60;

function formatZAR(amount) {
  return `R${Number(amount).toLocaleString("en-ZA")}`;
}

function handoffEmailHtml(otp, documentLinks) {
  const documentsHtml = documentLinks.length
    ? `<ul>${documentLinks.map((d) => `<li><a href="${d.url}">${d.docType}</a></li>`).join("")}</ul>`
    : "<p>No documents uploaded yet.</p>";
  return `
    <h2>New instruction: Offer to Purchase</h2>
    <p><strong>Buyer:</strong> ${otp.buyer_name} (ID ${otp.buyer_id_number}, contact ${otp.buyer_contact})</p>
    <p><strong>Seller:</strong> ${otp.seller_name} (${otp.seller_email})</p>
    <p><strong>Offer price:</strong> ${formatZAR(otp.offer_price)}</p>
    <p><strong>Deposit:</strong> ${formatZAR(otp.deposit)}</p>
    <p><strong>Occupation date:</strong> ${otp.occupation_date}</p>
    <p><strong>Suspensive conditions:</strong> ${otp.suspensive_conditions || "None"}</p>
    <h3>Documents</h3>
    ${documentsHtml}
    <p>Links expire in 7 days.</p>
  `;
}

// Conveyancer Handoff (MVP-SPEC.md #6, #11) -- seller selects a provider
// from the marketplace once the OTP is fully signed by both parties; this
// emails them everything needed to open the file (MVP-SPEC.md: "email
// automation is fine for MVP" -- no conveyancer-side portal/webhook).
conveyancerRouter.post(
  "/otps/mine/:id/send-to-conveyancer",
  requireAuth,
  requireRole("seller"),
  asyncRoute(async (req, res) => {
    const { providerId, sellerName, sellerEmail } = req.body;
    if (!providerId || !sellerName || !sellerEmail) {
      return res.status(400).json({ error: "providerId, sellerName and sellerEmail are required." });
    }

    const result = await withUserContext(req.user, async (client) => {
      const otp = await client.query(
        `SELECT id, buyer_name, buyer_id_number, buyer_contact, offer_price, deposit,
                occupation_date, suspensive_conditions, signed_by_buyer, signed_by_seller
         FROM otps WHERE id = $1`,
        [req.params.id]
      );
      if (otp.rows.length === 0) return { notFound: true };
      if (!otp.rows[0].signed_by_buyer || !otp.rows[0].signed_by_seller) {
        return { notFullySigned: true };
      }

      const provider = await client.query(
        "SELECT name, email FROM providers WHERE id = $1 AND category = 'Conveyancers'",
        [providerId]
      );
      if (provider.rows.length === 0) return { providerNotFound: true };

      const documents = await client.query("SELECT doc_type, s3_key FROM documents WHERE otp_id = $1", [
        req.params.id,
      ]);

      await client.query(
        "UPDATE otps SET conveyancer_provider_id = $2, conveyancer_sent_at = now(), updated_at = now() WHERE id = $1",
        [req.params.id, providerId]
      );
      await client.query(
        `INSERT INTO otp_history (otp_id, seller_id, event, by_party)
         VALUES ($1, $2, $3, 'seller')`,
        [req.params.id, req.user.id, `Sent to conveyancer: ${provider.rows[0].name}`]
      );

      return { otp: otp.rows[0], provider: provider.rows[0], documents: documents.rows };
    });

    if (result.notFound) return res.status(404).json({ error: "Offer not found." });
    if (result.notFullySigned) {
      return res.status(409).json({ error: "The OTP must be signed by both parties before handoff." });
    }
    if (result.providerNotFound) {
      return res.status(404).json({ error: "Conveyancer not found." });
    }

    const documentLinks = await Promise.all(
      result.documents.map(async (doc) => ({
        docType: doc.doc_type,
        url: await getSignedUrl(s3, new GetObjectCommand({ Bucket: DOCUMENTS_BUCKET, Key: doc.s3_key }), {
          expiresIn: DOCUMENT_LINK_TTL_SECONDS,
        }),
      }))
    );

    await sendEmail({
      to: result.provider.email,
      subject: `New instruction: Offer to Purchase -- ${result.otp.buyer_name}`,
      html: handoffEmailHtml({ ...result.otp, seller_name: sellerName, seller_email: sellerEmail }, documentLinks),
      text: `New instruction for ${result.otp.buyer_name}'s Offer to Purchase. Offer price: ${formatZAR(
        result.otp.offer_price
      )}. See the SellSmart Property dashboard for full details and documents.`,
    });

    res.status(200).json({ sentTo: result.provider.email });
  })
);
