output "alb_dns_name" {
  value = module.compute.alb_dns_name
}

output "cloudfront_domain_name" {
  value = module.cdn.distribution_domain_name
}

output "database_cluster_endpoint" {
  value     = module.database.cluster_endpoint
  sensitive = true
}

output "cognito_user_pool_id" {
  value = module.auth.user_pool_id
}

output "cognito_web_client_id" {
  value = module.auth.web_client_id
}

output "documents_bucket" {
  value = module.storage.documents_bucket
}

output "photos_bucket" {
  value = module.storage.photos_bucket
}
