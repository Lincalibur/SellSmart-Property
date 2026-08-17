# SellSmart Property — Infrastructure (Terraform)

Implements `docs/Unified-Infrastructure-Architecture.md`: Aurora PostgreSQL
Serverless v2, Cognito, S3, ECS Fargate, CloudFront + WAF, all in
`af-south-1`. One module set, sized differently per environment file — there
is no separate "Stage 2 module" or "Stage 3 module." Growth is a `.tfvars`
change (ACU ceiling, replica count, task count/size), not a rewrite.

## Status

**Not yet applied to a real AWS account.** This is code, reviewed and ready
to run once an account exists. No resources have been provisioned.

## Layout

```
terraform/
  providers.tf          AWS provider, af-south-1, remote state backend (placeholder)
  variables.tf           Root input variables
  main.tf                 Wires the modules together
  outputs.tf              ALB/CloudFront URLs, Cognito pool ID, DB endpoint, etc.
  modules/
    network/               VPC, subnets, security groups
    database/               Aurora PostgreSQL Serverless v2 cluster
    auth/                    Cognito user pool, app client, role groups
    storage/                 S3 buckets (documents, photos) with Object Lock
    compute/                 ECS Fargate service + Application Load Balancer
    cdn/                     CloudFront distribution + AWS WAF
  environments/
    stage0.tfvars           Pilot sizing (matches the Stage 0 cost estimate)
```

## Before this can be applied

1. **An AWS account**, with billing set up, and an IAM user/role with
   permission to create the resources above.
2. **A Terraform state backend** — `providers.tf` has a placeholder `backend
   "s3"` block, commented out. Create a small S3 bucket + DynamoDB lock table
   by hand first (chicken-and-egg problem — state storage can't manage
   itself), then uncomment and fill in the bucket name.
3. **Secrets** — the Aurora master password, and later the PayFast/DocuSign
   API keys, are read from AWS Secrets Manager (see `modules/database/main.tf`
   and the `secrets` module stub) — never hardcoded into `.tf` files or
   `.tfvars`. Create the secret values in the AWS console or CLI before
   applying; Terraform references them by ARN/name only.
4. Review `environments/stage0.tfvars` and fill in the placeholders marked
   `CHANGEME` (project name, domain if any, alert email).

## Applying (once the above is in place)

```
cd terraform
terraform init
terraform plan  -var-file=environments/stage0.tfvars
terraform apply -var-file=environments/stage0.tfvars
```

Moving to Stage 1/2/3 later: copy `stage0.tfvars` to `stage1.tfvars` etc.,
raise the sizing variables per `docs/Unified-Infrastructure-Architecture.md`
§3, and `terraform apply -var-file=environments/stage1.tfvars` against the
same state. Nothing is recreated; existing resources are resized in place.

## What's deliberately not in this first pass

- Read replicas (added at the Stage 2 `.tfvars`, not before — no reason to
  pay for one at pilot scale).
- Shield Advanced (Stage 3 optional add, see the cost doc).
- The actual application container image / CI deploy step — this branch is
  infrastructure only. Wiring `ci.yml`/`release.yml` to build and push to
  ECR is the next slice of this epic, once there's an API service to
  containerize.
