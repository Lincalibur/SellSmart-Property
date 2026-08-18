import { createHmac, timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";

// account-d.docusign.com / demo.docusign.net are the sandbox ("developer
// account") hosts -- swap to account.docusign.com / www.docusign.net once
// a real (production) DocuSign account exists. No DocuSign account of any
// kind exists yet (see docs/BACKEND-STACK-RECOMMENDATION.md), so none of
// this is exercised against a real API in CI -- api/src/lib/docusign.test.js
// covers verifyConnectSignature (pure, deterministic) the same way
// payfast.test.js covers PayFast's signature algorithm; the JWT
// grant/envelope/recipient-view calls below are implemented against
// DocuSign's documented REST API contract but only get exercised for real
// once real credentials exist, same as Cognito token verification.
const AUTH_SERVER = process.env.DOCUSIGN_AUTH_SERVER ?? "account-d.docusign.com";
const BASE_PATH = process.env.DOCUSIGN_BASE_PATH ?? "https://demo.docusign.net/restapi";
const INTEGRATION_KEY = process.env.DOCUSIGN_INTEGRATION_KEY;
const USER_ID = process.env.DOCUSIGN_USER_ID;
const ACCOUNT_ID = process.env.DOCUSIGN_ACCOUNT_ID;
const PRIVATE_KEY = process.env.DOCUSIGN_PRIVATE_KEY;

// JWT Grant (server-to-server, no user interaction) -- the standard flow
// for a backend that signs envelopes on behalf of the platform rather than
// a logged-in DocuSign user. Scope "impersonation" requires the account
// admin to have granted consent to USER_ID for INTEGRATION_KEY once,
// out-of-band, before this will succeed.
export async function getAccessToken() {
  const assertion = jwt.sign(
    { scope: "signature impersonation" },
    PRIVATE_KEY,
    { algorithm: "RS256", issuer: INTEGRATION_KEY, subject: USER_ID, audience: AUTH_SERVER, expiresIn: "1h" }
  );

  const res = await fetch(`https://${AUTH_SERVER}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) {
    throw new Error(`DocuSign token request failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()).access_token;
}

function otpSummaryHtml(otp) {
  // A minimal HTML "document" -- DocuSign converts this to PDF server-side
  // (fileExtension: "html"). A real templated Offer to Purchase document is
  // future work; this is enough to prove the envelope/signing flow end to
  // end with the terms actually agreed (MVP-SPEC.md #6's OTP fields).
  return `<html><body>
    <h2>Offer to Purchase</h2>
    <p>Buyer: ${otp.buyerName}</p>
    <p>Offer price: R${otp.offerPrice}</p>
    <p>Deposit: R${otp.deposit}</p>
    <p>Occupation date: ${otp.occupationDate}</p>
    <p>Suspensive conditions: ${otp.suspensiveConditions || "None"}</p>
    <p>Special conditions: ${otp.specialConditions || "None"}</p>
    <p>Buyer signature: /buyer_signature_1/</p>
    <p>Seller signature: /seller_signature_1/</p>
  </body></html>`;
}

// Creates the envelope with both parties as *embedded* (captive)
// recipients -- clientUserId is what makes a recipient embeddable rather
// than emailed a DocuSign-hosted link, matching the Signing Screen's "you
// never leave SellSmart Property" promise. clientUserId also doubles as
// how the Connect webhook maps a completed signer back to buyer vs seller
// (see routes/docusign.js).
export async function createEnvelope(otp, { buyerEmail, sellerEmail, sellerName }) {
  const accessToken = await getAccessToken();
  const documentId = "1";

  const body = {
    emailSubject: `Offer to Purchase -- ${otp.buyerName}`,
    status: "sent",
    documents: [
      {
        documentId,
        name: "Offer to Purchase.html",
        fileExtension: "html",
        documentBase64: Buffer.from(otpSummaryHtml(otp)).toString("base64"),
      },
    ],
    recipients: {
      signers: [
        {
          recipientId: "1",
          routingOrder: "1",
          clientUserId: "buyer",
          name: otp.buyerName,
          email: buyerEmail,
          tabs: { signHereTabs: [{ documentId, anchorString: "/buyer_signature_1/" }] },
        },
        {
          recipientId: "2",
          routingOrder: "1",
          clientUserId: "seller",
          name: sellerName,
          email: sellerEmail,
          tabs: { signHereTabs: [{ documentId, anchorString: "/seller_signature_1/" }] },
        },
      ],
    },
  };

  const res = await fetch(`${BASE_PATH}/v2.1/accounts/${ACCOUNT_ID}/envelopes`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`DocuSign envelope creation failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()).envelopeId;
}

// Recipient view = the embedded signing URL for one specific signer.
// clientUserId must match what createEnvelope registered that signer with.
export async function createRecipientView(envelopeId, { clientUserId, name, email, returnUrl }) {
  const accessToken = await getAccessToken();
  const res = await fetch(`${BASE_PATH}/v2.1/accounts/${ACCOUNT_ID}/envelopes/${envelopeId}/views/recipient`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      returnUrl,
      authenticationMethod: "none",
      clientUserId,
      userName: name,
      email,
    }),
  });
  if (!res.ok) {
    throw new Error(`DocuSign recipient view creation failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()).url;
}

// DocuSign Connect signs the raw JSON payload with HMAC-SHA256, base64,
// in the X-DocuSign-Signature-1 header (additional keys use -2, -3, ...
// if the Connect config has more than one; only the first is used here).
// Needs the *raw* request body -- see routes/docusign.js's use of
// express.raw() for this route, same reasoning as PayFast's ITN needing
// the exact field order it was sent in.
export function verifyConnectSignature(rawBody, signatureHeader, hmacKey) {
  if (!signatureHeader || !hmacKey) return false;
  const expected = createHmac("sha256", hmacKey).update(rawBody).digest("base64");
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signatureHeader);
  return expectedBuf.length === actualBuf.length && timingSafeEqual(expectedBuf, actualBuf);
}
