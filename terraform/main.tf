module "network" {
  source = "./modules/network"

  project_name       = var.project_name
  vpc_cidr           = var.vpc_cidr
  az_count           = var.az_count
  enable_nat_gateway = var.enable_nat_gateway
}

module "database" {
  source = "./modules/database"

  project_name                = var.project_name
  environment                 = var.environment
  private_subnet_ids          = module.network.private_subnet_ids
  database_security_group_id  = module.network.database_security_group_id
  db_name                     = var.db_name
  db_min_acu                  = var.db_min_acu
  db_max_acu                  = var.db_max_acu
  db_read_replica_count       = var.db_read_replica_count
  db_master_secret_name       = var.db_master_secret_name
}

module "auth" {
  source = "./modules/auth"

  project_name = var.project_name
  environment  = var.environment
  cognito_mfa  = var.cognito_mfa
}

module "storage" {
  source = "./modules/storage"

  project_name              = var.project_name
  environment                = var.environment
  document_retention_years   = var.document_retention_years
}

module "compute" {
  source = "./modules/compute"

  project_name           = var.project_name
  environment             = var.environment
  aws_region              = var.aws_region
  vpc_id                  = module.network.vpc_id
  public_subnet_ids       = module.network.public_subnet_ids
  app_security_group_id   = module.network.app_security_group_id
  alb_security_group_id   = module.network.alb_security_group_id
  app_image                = var.app_image
  app_task_cpu             = var.app_task_cpu
  app_task_memory          = var.app_task_memory
  app_desired_count        = var.app_desired_count
}

module "cdn" {
  source = "./modules/cdn"
  providers = {
    aws              = aws
    aws.us_east_1    = aws.us_east_1
  }

  project_name                       = var.project_name
  environment                         = var.environment
  domain_name                         = var.domain_name
  alb_dns_name                        = module.compute.alb_dns_name
  photos_bucket_regional_domain_name  = module.storage.photos_bucket_regional_domain_name
}

resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-${var.environment}-alerts"
}

resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}
