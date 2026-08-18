// Pure, deterministic tests -- no network, no DB. This is the part of the
// PayFast integration we can actually verify byte-for-byte without a real
// merchant account (see api/README.md's Testing section): the signature
// algorithm PayFast uses in both directions (outgoing checkout fields,
// incoming ITN verification).
import assert from "node:assert/strict";
import { test } from "node:test";
import { payfastEncode, payfastSignature } from "./payfast.js";

test("payfastEncode matches PHP's urlencode, not encodeURIComponent", () => {
  assert.equal(payfastEncode("Smart Package"), "Smart+Package");
  assert.equal(payfastEncode("a!b'c(d)e*f"), "a%21b%27c%28d%29e%2Af");
  assert.equal(payfastEncode(" trim me "), "trim+me");
});

test("payfastSignature is deterministic for the same fields", () => {
  const fields = { merchant_id: "10000100", amount: "699.00", item_name: "Starter" };
  assert.equal(payfastSignature(fields), payfastSignature(fields));
});

test("payfastSignature changes if any field value changes", () => {
  const base = payfastSignature({ merchant_id: "10000100", amount: "699.00" });
  const tampered = payfastSignature({ merchant_id: "10000100", amount: "1.00" });
  assert.notEqual(base, tampered);
});

test("payfastSignature changes with field order (PayFast signs the literal order given)", () => {
  const a = payfastSignature({ a: "1", b: "2" });
  const b = payfastSignature({ b: "2", a: "1" });
  assert.notEqual(a, b);
});

test("payfastSignature skips empty/undefined/null fields", () => {
  const withEmpty = payfastSignature({ a: "1", b: "", c: undefined, d: null });
  const withoutEmpty = payfastSignature({ a: "1" });
  assert.equal(withEmpty, withoutEmpty);
});

test("payfastSignature incorporates the passphrase when set", () => {
  const noPass = payfastSignature({ a: "1" }, undefined);
  const withPass = payfastSignature({ a: "1" }, "secret");
  assert.notEqual(noPass, withPass);
});

test("payfastSignature produces a 32-char lowercase hex md5", () => {
  const sig = payfastSignature({ a: "1" });
  assert.match(sig, /^[0-9a-f]{32}$/);
});
