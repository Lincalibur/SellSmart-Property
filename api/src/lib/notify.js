import { sendEmail } from "./email.js";
import { getUser } from "./cognito.js";

// Transactional email only (MVP-SPEC.md's explicit-out-of-scope list rules
// out in-app chat/messaging) -- every function here is a best-effort side
// effect of an otherwise-already-successful write. A failed notification
// must never fail the request that triggered it (the enquiry/offer/
// document/etc. is already saved by the time any of these run), so every
// path swallows its own errors and just logs.
async function send(to, subject, html, text) {
  if (!to) return;
  try {
    await sendEmail({ to, subject, html, text });
  } catch (err) {
    console.error(`notify: failed to send "${subject}" to ${to}:`, err);
  }
}

// Sellers don't have a stored email in Postgres -- Cognito is the user
// store (see lib/cognito.js) -- so this resolves it first. That lookup
// itself is one more thing that can harmlessly fail (no AWS account
// exists yet; see cognito.js's timeout comment), which is why this has
// its own try/catch rather than just letting send()'s missing-`to` guard
// handle it silently.
async function sendToSeller(sellerId, subject, html, text) {
  let seller;
  try {
    seller = await getUser(sellerId);
  } catch (err) {
    console.error(`notify: failed to look up seller ${sellerId}:`, err);
    return;
  }
  await send(seller?.email, subject, html, text);
}

function formatZAR(amount) {
  return `R${Number(amount).toLocaleString("en-ZA")}`;
}

export async function notifyNewEnquiry({ sellerId, listingTitle, name, message }) {
  await sendToSeller(
    sellerId,
    `New enquiry: ${listingTitle}`,
    `<p><strong>${name}</strong> sent an enquiry about <strong>${listingTitle}</strong>:</p><p>${message}</p>`,
    `${name} sent an enquiry about ${listingTitle}: ${message}`
  );
}

export async function notifyNewViewingRequest({ sellerId, listingTitle, name, date, time }) {
  await sendToSeller(
    sellerId,
    `New viewing request: ${listingTitle}`,
    `<p><strong>${name}</strong> requested a viewing of <strong>${listingTitle}</strong> on ${date} at ${time}.</p>`,
    `${name} requested a viewing of ${listingTitle} on ${date} at ${time}.`
  );
}

export async function notifyNewOffer({ sellerId, listingTitle, buyerName, offerPrice }) {
  await sendToSeller(
    sellerId,
    `New offer: ${listingTitle}`,
    `<p><strong>${buyerName}</strong> submitted an offer of <strong>${formatZAR(offerPrice)}</strong> on <strong>${listingTitle}</strong>.</p>`,
    `${buyerName} submitted an offer of ${formatZAR(offerPrice)} on ${listingTitle}.`
  );
}

const SELLER_RESPONSE_COPY = {
  accept: (amount) => `Your offer of ${formatZAR(amount)} was accepted.`,
  reject: () => "Your offer was declined.",
  counter: (amount) => `The seller countered with ${formatZAR(amount)}.`,
};

export async function notifySellerResponse({ buyerEmail, decision, offerPrice, counterPrice }) {
  const text = SELLER_RESPONSE_COPY[decision](decision === "counter" ? counterPrice : offerPrice);
  await send(buyerEmail, "Update on your offer", `<p>${text}</p>`, text);
}

export async function notifyCounterAccepted({ sellerId, listingTitle, counterPrice }) {
  const text = `The buyer accepted your counter-offer of ${formatZAR(counterPrice)} on ${listingTitle}.`;
  await sendToSeller(sellerId, `Counter-offer accepted: ${listingTitle}`, `<p>${text}</p>`, text);
}

// One of these two recipients is always resolved server-side by the
// caller (documents.js knows which party just uploaded), never trusted
// from a request body.
export async function notifyDocumentUploaded({ sellerId, buyerEmail, uploadedBy, docType }) {
  const text = `A new document (${docType}) was uploaded.`;
  if (uploadedBy === "buyer") {
    await sendToSeller(sellerId, "New document uploaded", `<p>${text}</p>`, text);
  } else {
    await send(buyerEmail, "New document uploaded", `<p>${text}</p>`, text);
  }
}

// Notifies the *other* party -- whoever didn't just sign.
export async function notifyOtpSigned({ sellerId, buyerEmail, signedBy }) {
  const text = `The ${signedBy} has signed the Offer to Purchase.`;
  if (signedBy === "buyer") {
    await sendToSeller(sellerId, "OTP signed by buyer", `<p>${text}</p>`, text);
  } else {
    await send(buyerEmail, "OTP signed by seller", `<p>${text}</p>`, text);
  }
}
