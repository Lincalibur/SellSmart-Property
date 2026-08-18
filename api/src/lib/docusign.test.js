// Pure, deterministic tests -- no network, no DB. Mirrors payfast.test.js:
// the one part of a can't-hit-a-real-account integration verifiable
// byte-for-byte on its own (see api/README.md's Testing section).
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { verifyConnectSignature } from "./docusign.js";

test("verifyConnectSignature accepts a correctly signed payload", () => {
  const body = Buffer.from(JSON.stringify({ event: "envelope-completed", data: { envelopeId: "abc-123" } }));
  const signature = createHmac("sha256", "hmac-secret").update(body).digest("base64");
  assert.equal(verifyConnectSignature(body, signature, "hmac-secret"), true);
});

test("verifyConnectSignature rejects a tampered body", () => {
  const original = Buffer.from(JSON.stringify({ data: { envelopeId: "abc-123" } }));
  const signature = createHmac("sha256", "hmac-secret").update(original).digest("base64");
  const tampered = Buffer.from(JSON.stringify({ data: { envelopeId: "different-id" } }));
  assert.equal(verifyConnectSignature(tampered, signature, "hmac-secret"), false);
});

test("verifyConnectSignature rejects the wrong hmac key", () => {
  const body = Buffer.from(JSON.stringify({ data: { envelopeId: "abc-123" } }));
  const signature = createHmac("sha256", "hmac-secret").update(body).digest("base64");
  assert.equal(verifyConnectSignature(body, signature, "wrong-secret"), false);
});

test("verifyConnectSignature rejects a missing signature or key", () => {
  const body = Buffer.from("{}");
  assert.equal(verifyConnectSignature(body, undefined, "hmac-secret"), false);
  assert.equal(verifyConnectSignature(body, "somesig", undefined), false);
});
