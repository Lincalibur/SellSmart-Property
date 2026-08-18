// Integration test against a real SES-compatible endpoint (LocalStack in
// CI -- see the api-test job in .github/workflows/ci.yml), same bar as
// s3.js's tests: worth exercising the actual send, not mocking it.
// LocalStack's /_aws/ses inspection endpoint lists recently sent messages,
// which is what lets this assert on the real thing SES received rather
// than just "the SDK call didn't throw."
import assert from "node:assert/strict";
import { test } from "node:test";
import { sendEmail, EMAIL_FROM } from "./email.js";

test("sendEmail actually delivers to the SES-compatible endpoint", async () => {
  const to = "buyer@example.example";
  const subject = `Test email ${Date.now()}`;
  await sendEmail({ to, subject, html: "<p>hello</p>", text: "hello" });

  const res = await fetch(`${process.env.SES_ENDPOINT}/_aws/ses`);
  assert.equal(res.status, 200);
  const { messages } = await res.json();
  const sent = messages.find((m) => m.Subject === subject);
  assert.ok(sent, "expected the sent message to appear in LocalStack's SES message list");
  assert.deepEqual(sent.Destination.ToAddresses, [to]);
  assert.equal(sent.Source, EMAIL_FROM);
});
