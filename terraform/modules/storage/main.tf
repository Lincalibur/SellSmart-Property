resource "aws_kms_key" "storage" {
  description             = "${var.project_name} document/photo storage encryption key"
  deletion_window_in_days = 30
  enable_key_rotation     = true
}

# Signed OTPs, title deeds, FICA docs -- Object Lock enforces the FICA
# retention requirement at the storage layer (can't be deleted or
# overwritten early, even by an administrator, without a legal-hold change).
resource "aws_s3_bucket" "documents" {
  bucket = "${var.project_name}-${var.environment}-documents"

  object_lock_enabled = true
}

resource "aws_s3_bucket_versioning" "documents" {
  bucket = aws_s3_bucket.documents.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_object_lock_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  rule {
    default_retention {
      mode  = "GOVERNANCE"
      years = var.document_retention_years
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.storage.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "documents" {
  bucket = aws_s3_bucket.documents.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Listing/property photos -- no Object Lock (not a legal record), but still
# encrypted, versioned, and lifecycle-managed. CloudFront reads from here.
resource "aws_s3_bucket" "photos" {
  bucket = "${var.project_name}-${var.environment}-photos"
}

resource "aws_s3_bucket_versioning" "photos" {
  bucket = aws_s3_bucket.photos.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "photos" {
  bucket = aws_s3_bucket.photos.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.storage.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "photos" {
  bucket = aws_s3_bucket.photos.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle rule to move older photo versions to cheaper storage -- a policy
# change at Stage 2+, not a migration. Off by default at Stage 0 (no old
# versions to move yet), included so it's a one-line toggle later.
resource "aws_s3_bucket_lifecycle_configuration" "photos" {
  bucket = aws_s3_bucket.photos.id

  rule {
    id     = "noncurrent-version-to-glacier"
    status = var.enable_lifecycle_transition ? "Enabled" : "Disabled"

    filter {} # applies to all objects in the bucket

    noncurrent_version_transition {
      noncurrent_days = 90
      storage_class   = "GLACIER_IR"
    }
  }
}
