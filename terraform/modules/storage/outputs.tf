output "documents_bucket" {
  value = aws_s3_bucket.documents.id
}

output "documents_bucket_arn" {
  value = aws_s3_bucket.documents.arn
}

output "photos_bucket" {
  value = aws_s3_bucket.photos.id
}

output "photos_bucket_arn" {
  value = aws_s3_bucket.photos.arn
}

output "photos_bucket_regional_domain_name" {
  value = aws_s3_bucket.photos.bucket_regional_domain_name
}

output "kms_key_arn" {
  value = aws_kms_key.storage.arn
}
