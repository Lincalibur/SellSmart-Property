variable "aws_region" {
  description = "AWS region. af-south-1 (Cape Town) per docs/Unified-Infrastructure-Architecture.md."
  type        = string
  default     = "af-south-1"
}

variable "environment" {
  description = "Environment name, e.g. stage0, stage1, production."
  type        = string
}

variable "project_name" {
  description = "Short name used to prefix resource names."
  type        = string
  default     = "sellsmart-property"
}

variable "alert_email" {
  description = "Email address for infrastructure alarms (CloudWatch -> SNS)."
  type        = string
}

# --- Network ---

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.20.0.0/16"
}

variable "az_count" {
  description = "Number of availability zones to spread subnets across."
  type        = number
  default     = 2
}

variable "enable_nat_gateway" {
  description = "Create a NAT gateway for private-subnet egress. Off at Stage 0 to save cost (Fargate tasks run in public subnets with restrictive security groups); turn on from Stage 1."
  type        = bool
  default     = false
}

# --- Database ---

variable "db_min_acu" {
  description = "Aurora Serverless v2 minimum capacity units."
  type        = number
  default     = 0.5
}

variable "db_max_acu" {
  description = "Aurora Serverless v2 maximum capacity units."
  type        = number
  default     = 2
}

variable "db_read_replica_count" {
  description = "Number of Aurora read replicas. 0 until Stage 2."
  type        = number
  default     = 0
}

variable "db_name" {
  description = "Default database name."
  type        = string
  default     = "sellsmart"
}

variable "db_master_secret_name" {
  description = "Name of the AWS Secrets Manager secret holding the Aurora master username/password. Create this out of band before applying (see README.md)."
  type        = string
}

# --- Auth ---

variable "cognito_mfa" {
  description = "Cognito MFA setting: OFF, OPTIONAL, or REQUIRED. Required for the Admin/Provider role groups regardless of this default, per docs/Infrastructure-Hosting-Plan.md #4."
  type        = string
  default     = "OPTIONAL"
}

# --- Storage ---

variable "document_retention_years" {
  description = "Minimum retention (years) enforced via S3 Object Lock on the documents bucket, per FICA record-keeping requirements."
  type        = number
  default     = 5
}

# --- Compute ---

variable "app_image" {
  description = "Container image (ECR URI:tag) for the API service. Placeholder until the CI pipeline pushes a real image."
  type        = string
  default     = "public.ecr.aws/docker/library/httpd:latest" # placeholder — replace once the API image exists
}

variable "app_task_cpu" {
  description = "Fargate task CPU units."
  type        = number
  default     = 256
}

variable "app_task_memory" {
  description = "Fargate task memory (MB)."
  type        = number
  default     = 512
}

variable "app_desired_count" {
  description = "Number of running Fargate tasks."
  type        = number
  default     = 1
}

# --- CDN / WAF ---

variable "domain_name" {
  description = "Custom domain for CloudFront, e.g. app.sellsmartproperty.co.za. Leave blank to use the default CloudFront domain."
  type        = string
  default     = ""
}
