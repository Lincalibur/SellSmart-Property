import { createHash } from "node:crypto";

// PayFast's publicly documented sandbox test credentials -- safe to ship
// as the default (they're not a secret; PayFast publishes them for
// integration testing). Real credentials come from env vars once a
// merchant account exists.
const DEFAULT_SANDBOX_MERCHANT_ID = "10000100";
const DEFAULT_SANDBOX_MERCHANT_KEY = "46f0cd694581a";

export const PAYFAST_MERCHANT_ID = process.env.PAYFAST_MERCHANT_ID ?? DEFAULT_SANDBOX_MERCHANT_ID;
export const PAYFAST_MERCHANT_KEY = process.env.PAYFAST_MERCHANT_KEY ?? DEFAULT_SANDBOX_MERCHANT_KEY;
export const PAYFAST_PASSPHRASE = process.env.PAYFAST_PASSPHRASE || undefined;
export const PAYFAST_CHECKOUT_URL =
  process.env.PAYFAST_CHECKOUT_URL ?? "https://sandbox.payfast.co.za/eng/process";

// PayFast requires PHP's urlencode() byte-for-byte (spaces as '+', and a
// handful of characters JS's encodeURIComponent leaves unescaped that PHP
// doesn't) -- a signature computed with encodeURIComponent's own escaping
// won't match what PayFast computes on their end.
export function payfastEncode(value) {
  return encodeURIComponent(String(value).trim())
    .replace(/%20/g, "+")
    .replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

// Same algorithm both directions: building the outgoing checkout
// signature and verifying an incoming ITN's signature. `fields` must be
// in the order PayFast expects (insertion order of the object) with
// `signature` itself already excluded -- see api/src/routes/payments.js
// for how each side prepares that order.
export function payfastSignature(fields, passphrase = PAYFAST_PASSPHRASE) {
  const parts = [];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === "") continue;
    parts.push(`${key}=${payfastEncode(value)}`);
  }
  let query = parts.join("&");
  if (passphrase) {
    query += `&passphrase=${payfastEncode(passphrase)}`;
  }
  return createHash("md5").update(query).digest("hex");
}

// Builds the field set + signature for the hosted-checkout redirect
// (MVP-SPEC.md #6 "Payment Screen") -- the frontend auto-submits these as
// a form POST to PAYFAST_CHECKOUT_URL, so this API never touches card
// details itself.
export function buildCheckoutFields({ paymentId, amount, itemName, returnUrl, cancelUrl, notifyUrl }) {
  const fields = {
    merchant_id: PAYFAST_MERCHANT_ID,
    merchant_key: PAYFAST_MERCHANT_KEY,
    return_url: returnUrl,
    cancel_url: cancelUrl,
    notify_url: notifyUrl,
    m_payment_id: paymentId,
    amount: Number(amount).toFixed(2),
    item_name: itemName,
  };
  return { ...fields, signature: payfastSignature(fields) };
}
