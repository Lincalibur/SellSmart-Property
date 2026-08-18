import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

// SES_ENDPOINT points this at LocalStack for local dev/CI, same pattern as
// lib/s3.js -- unset in production, where the SDK talks to real SES using
// the ECS task's IAM role. No AWS account exists yet (see db/README.md),
// so nothing here has been exercised against real SES -- only LocalStack.
// Classic SES (v1 API), not SESv2 -- LocalStack's community edition
// doesn't implement SESv2 (Pro-only), confirmed by CI failing with
// "API for service 'sesv2' not yet implemented or pro feature" when this
// was first tried with @aws-sdk/client-sesv2.
export const ses = new SESClient({
  region: process.env.AWS_REGION ?? "af-south-1",
  endpoint: process.env.SES_ENDPOINT || undefined,
});

// SES requires the From address to be a verified identity (domain or
// single address) -- not set up yet either; this is a placeholder until a
// domain exists to verify (terraform/environments/stage0.tfvars'
// domain_name is still blank).
export const EMAIL_FROM = process.env.EMAIL_FROM ?? "no-reply@sellsmartproperty.example";

export async function sendEmail({ to, subject, html, text }) {
  await ses.send(
    new SendEmailCommand({
      Source: EMAIL_FROM,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: {
          Html: { Data: html, Charset: "UTF-8" },
          Text: { Data: text, Charset: "UTF-8" },
        },
      },
    })
  );
}
