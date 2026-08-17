terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # State backend — bootstrap the bucket/lock table by hand first (see
  # README.md), then uncomment and fill in. Left as local state until then
  # so `terraform init` works out of the box for review purposes.
  #
  # backend "s3" {
  #   bucket         = "CHANGEME-sellsmart-tfstate"
  #   key            = "sellsmart-property/terraform.tfstate"
  #   region         = "af-south-1"
  #   dynamodb_table = "CHANGEME-sellsmart-tfstate-lock"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "sellsmart-property"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# CloudFront WAF web ACLs must live in us-east-1 regardless of the app
# region -- passed into modules/cdn explicitly.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "sellsmart-property"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
