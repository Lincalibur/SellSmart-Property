import express from "express";
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, DOCUMENTS_BUCKET } from "../lib/s3.js";
import { withOtpAccess, withUserContext } from "../db/pool.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncRoute } from "../middleware/asyncRoute.js";
import { notifyDocumentUploaded } from "../lib/notify.js";

export const documentsRouter = express.Router();

// Mirrors src/data/seed.js's DOCUMENT_CHECKLIST d1-d8 -- see the comment in
// db/migrations/0011_documents.sql for the id mapping. Keep both in sync.
const DOC_TYPES = [
  "buyer_id",
  "proof_of_address",
  "offer_to_purchase",
  "proof_of_funds",
  "title_deed",
  "condition_disclosure",
  "electrical_coc",
  "rates_clearance",
];

const PRESIGN_TTL_SECONDS = 300;

function s3KeyFor(otpId, docType) {
  // Stable per (otp, docType) -- a re-upload overwrites this key, which S3
  // versioning (terraform/modules/storage) turns into a new version rather
  // than losing the old one.
  return `otps/${otpId}/${docType}`;
}

function toDocumentJson(row) {
  return { docType: row.doc_type, uploadedBy: row.uploaded_by, uploadedAt: row.uploaded_at };
}

// Document Hub upload flow (MVP-SPEC.md #6) never streams the file through
// this API -- the client PUTs directly to S3 with this presigned URL, then
// calls confirm below once that succeeds. Presigning doesn't touch the DB
// (it's local crypto, no network call), so this doesn't check the OTP is
// real -- a caller with no real otp_id can only ever get a URL to an
// orphan S3 key that `confirm` will refuse to record, since that route
// does look the OTP's real seller_id up.
async function handleUploadUrl(req, res) {
  const { docType } = req.body;
  if (!DOC_TYPES.includes(docType)) {
    return res.status(400).json({ error: `docType must be one of: ${DOC_TYPES.join(", ")}` });
  }

  const key = s3KeyFor(req.params.id, docType);
  const uploadUrl = await getSignedUrl(s3, new PutObjectCommand({ Bucket: DOCUMENTS_BUCKET, Key: key }), {
    expiresIn: PRESIGN_TTL_SECONDS,
  });
  res.json({ key, uploadUrl });
}

// Verifies the object actually landed in S3 (never trust the client's word
// for it) before recording the upload -- same "don't trust the request
// body for anything checkable server-side" instinct as every other epic's
// seller_id lookups.
async function handleConfirm(req, res, runInContext, uploadedBy) {
  const { docType } = req.params;
  if (!DOC_TYPES.includes(docType)) {
    return res.status(400).json({ error: `docType must be one of: ${DOC_TYPES.join(", ")}` });
  }

  const key = s3KeyFor(req.params.id, docType);
  try {
    await s3.send(new HeadObjectCommand({ Bucket: DOCUMENTS_BUCKET, Key: key }));
  } catch {
    return res.status(400).json({ error: "No upload found at that key yet -- upload to the presigned URL first." });
  }

  const result = await runInContext(async (client) => {
    const otp = await client.query("SELECT seller_id, buyer_email FROM otps WHERE id = $1", [req.params.id]);
    if (otp.rows.length === 0) return null;

    const inserted = await client.query(
      `INSERT INTO documents (otp_id, seller_id, doc_type, uploaded_by, s3_key)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (otp_id, doc_type)
       DO UPDATE SET uploaded_by = EXCLUDED.uploaded_by, s3_key = EXCLUDED.s3_key, uploaded_at = now()
       RETURNING doc_type, uploaded_by, uploaded_at`,
      [req.params.id, otp.rows[0].seller_id, docType, uploadedBy, key]
    );
    return { document: inserted.rows[0], sellerId: otp.rows[0].seller_id, buyerEmail: otp.rows[0].buyer_email };
  });

  if (!result) {
    return res.status(404).json({ error: "Offer not found." });
  }

  // Not awaited -- see the comment in enquiries.js's POST route.
  notifyDocumentUploaded({
    sellerId: result.sellerId,
    buyerEmail: result.buyerEmail,
    uploadedBy,
    docType,
  });

  res.status(201).json(toDocumentJson(result.document));
}

async function handleList(req, res, runInContext) {
  const documents = await runInContext((client) =>
    client.query("SELECT doc_type, uploaded_by, uploaded_at, s3_key FROM documents WHERE otp_id = $1", [
      req.params.id,
    ])
  );
  const withUrls = await Promise.all(
    documents.rows.map(async (row) => ({
      ...toDocumentJson(row),
      downloadUrl: await getSignedUrl(s3, new GetObjectCommand({ Bucket: DOCUMENTS_BUCKET, Key: row.s3_key }), {
        expiresIn: PRESIGN_TTL_SECONDS,
      }),
    }))
  );
  res.json(withUrls);
}

// Buyer side -- same "knowing the OTP id proves it's yours" capability
// model as api/src/routes/otps.js, reused unchanged via withOtpAccess.
documentsRouter.post("/otps/:id/documents/upload-url", asyncRoute(handleUploadUrl));
documentsRouter.post(
  "/otps/:id/documents/:docType/confirm",
  asyncRoute((req, res) => handleConfirm(req, res, (fn) => withOtpAccess(req.params.id, fn), "buyer"))
);
documentsRouter.get(
  "/otps/:id/documents",
  asyncRoute((req, res) => handleList(req, res, (fn) => withOtpAccess(req.params.id, fn)))
);

// Seller side.
documentsRouter.post(
  "/otps/mine/:id/documents/upload-url",
  requireAuth,
  requireRole("seller"),
  asyncRoute(handleUploadUrl)
);
documentsRouter.post(
  "/otps/mine/:id/documents/:docType/confirm",
  requireAuth,
  requireRole("seller"),
  asyncRoute((req, res) => handleConfirm(req, res, (fn) => withUserContext(req.user, fn), "seller"))
);
documentsRouter.get(
  "/otps/mine/:id/documents",
  requireAuth,
  requireRole("seller"),
  asyncRoute((req, res) => handleList(req, res, (fn) => withUserContext(req.user, fn)))
);
