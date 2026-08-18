// notify.js's buyer-facing paths (an email address it already has) go
// through sendEmail -- real SES via LocalStack, same as email.test.js.
// Its seller-facing paths (lib/cognito.js's getUser) can't be tested for
// real, same reason cognito.js itself can't (no AWS account, and
// LocalStack's cognito-idp emulation is Pro-only -- see that file's
// comment) -- what's verified here instead is the actual guarantee that
// matters: a failed/impossible Cognito lookup must never make these
// functions throw, since every one of them is a best-effort side effect
// of an already-successful write.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  notifyCounterAccepted,
  notifyDocumentUploaded,
  notifyNewEnquiry,
  notifyNewOffer,
  notifyNewViewingRequest,
  notifyOtpSigned,
  notifySellerResponse,
} from "./notify.js";

async function readSentMessages() {
  const res = await fetch(`${process.env.SES_ENDPOINT}/_aws/ses`);
  return (await res.json()).messages;
}

test("notifySellerResponse actually emails the buyer for each decision", async () => {
  const to = "buyer-response@example.example";
  await notifySellerResponse({ buyerEmail: to, decision: "accept", offerPrice: 1000000 });
  await notifySellerResponse({ buyerEmail: to, decision: "counter", offerPrice: 1000000, counterPrice: 950000 });
  await notifySellerResponse({ buyerEmail: to, decision: "reject", offerPrice: 1000000 });

  const messages = await readSentMessages();
  const sentToBuyer = messages.filter((m) => m.Destination.ToAddresses.includes(to));
  assert.equal(sentToBuyer.length, 3);
});

test("notifyDocumentUploaded emails the buyer when the seller uploaded", async () => {
  const to = "buyer-doc@example.example";
  await notifyDocumentUploaded({ sellerId: "irrelevant", buyerEmail: to, uploadedBy: "seller", docType: "title_deed" });

  const messages = await readSentMessages();
  assert.ok(messages.some((m) => m.Destination.ToAddresses.includes(to)));
});

test("notifyOtpSigned emails the buyer when the seller signed", async () => {
  const to = "buyer-signed@example.example";
  await notifyOtpSigned({ sellerId: "irrelevant", buyerEmail: to, signedBy: "seller" });

  const messages = await readSentMessages();
  assert.ok(messages.some((m) => m.Destination.ToAddresses.includes(to)));
});

test("a missing recipient email is a silent no-op, not an error", async () => {
  await assert.doesNotReject(notifySellerResponse({ buyerEmail: undefined, decision: "accept", offerPrice: 1 }));
});

// These all try a Cognito lookup that can't succeed in this environment
// (no AWS account, LocalStack can't emulate it) -- the point of this test
// is that none of that ever surfaces as a thrown error to the caller.
test("seller-facing notifications never throw even when the Cognito lookup can't succeed", async () => {
  // Run in parallel: each of these attempts a real Cognito call that
  // can't succeed here (no COGNITO_USER_POOL_ID configured for this test
  // file, and no real/emulated pool to answer even if there were -- see
  // cognito.js's timeout comment), so doing all six sequentially risks
  // tripping node:test's per-test timeout if any of them falls through to
  // a real (rejected) network round trip rather than failing immediately.
  await assert.doesNotReject(
    Promise.all([
      notifyNewEnquiry({ sellerId: "no-such-user", listingTitle: "Test Listing", name: "Buyer", message: "Hi" }),
      notifyNewViewingRequest({
        sellerId: "no-such-user",
        listingTitle: "Test Listing",
        name: "Buyer",
        date: "2026-09-01",
        time: "10:00",
      }),
      notifyNewOffer({ sellerId: "no-such-user", listingTitle: "Test Listing", buyerName: "Buyer", offerPrice: 1000000 }),
      notifyCounterAccepted({ sellerId: "no-such-user", listingTitle: "Test Listing", counterPrice: 950000 }),
      notifyDocumentUploaded({ sellerId: "no-such-user", buyerEmail: null, uploadedBy: "buyer", docType: "buyer_id" }),
      notifyOtpSigned({ sellerId: "no-such-user", buyerEmail: null, signedBy: "buyer" }),
    ])
  );
});
