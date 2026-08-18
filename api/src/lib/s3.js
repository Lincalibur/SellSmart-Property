import { S3Client } from "@aws-sdk/client-s3";

// S3_ENDPOINT/AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY point this at
// LocalStack for local dev and CI (see the api-test job in
// .github/workflows/ci.yml) -- unset in production, where the SDK picks up
// the real endpoint and the ECS task's IAM role credentials automatically.
// forcePathStyle is required for LocalStack (it doesn't support
// virtual-hosted-style bucket URLs); real S3 works with either.
export const s3 = new S3Client({
  region: process.env.AWS_REGION ?? "af-south-1",
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: Boolean(process.env.S3_ENDPOINT),
});

// Matches terraform/modules/storage's aws_s3_bucket.documents
// ("${project_name}-${environment}-documents") -- Object Lock (GOVERNANCE
// mode, db/migrations/0011's comment) is a bucket-level default set there,
// not something this app needs to specify per object.
export const DOCUMENTS_BUCKET = process.env.DOCUMENTS_BUCKET ?? "sellsmart-property-documents";
