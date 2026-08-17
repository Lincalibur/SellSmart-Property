# Stage 0 -- Pilot (<=1,000 users), per docs/Unified-Infrastructure-Architecture.md #3
# Fill in the CHANGEME values before applying.

environment  = "stage0"
project_name = "sellsmart-property"
aws_region   = "af-south-1"

alert_email = "CHANGEME@example.com"

# Network -- no NAT gateway yet, app tasks run in public subnets with
# restrictive security groups to avoid an unnecessary ~R700/mo at pilot scale.
az_count           = 2
enable_nat_gateway = false

# Database -- Aurora Serverless v2, smallest sensible range
db_min_acu            = 0.5
db_max_acu            = 2
db_read_replica_count = 0
db_master_secret_name = "sellsmart-property/stage0/db-master" # create in Secrets Manager first, see ../README.md

# Auth
cognito_mfa = "OPTIONAL" # Admin/Provider roles enforce MFA at the app layer regardless

# Storage
document_retention_years = 5

# Compute -- one task, smallest Fargate size
app_image         = "public.ecr.aws/docker/library/httpd:latest" # placeholder -- replace with the real ECR image
app_task_cpu      = 256
app_task_memory   = 512
app_desired_count = 1

# CDN
domain_name = "" # set once a domain is chosen; uses the default CloudFront domain until then
