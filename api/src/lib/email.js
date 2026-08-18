import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

// SES_ENDPOINT points this at LocalStack for local dev/CI, same pattern as
// lib/s3.js -- unset in production, where the SDK talks to real SES using
// the ECS task's IAM role. No AWS account exists yet (see db/README.md),
// so nothing here has been exercised against real SES -- only LocalStack.
export const ses = new SESv2Client({
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
      FromEmailAddress: EMAIL_FROM,
      Destination: { ToAddresses: [to] },
      Content: {
        Simple: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: {
            Html: { Data: html, Charset: "UTF-8" },
            Text: { Data: text, Charset: "UTF-8" },
          },
        },
      },
    })
  );
}
