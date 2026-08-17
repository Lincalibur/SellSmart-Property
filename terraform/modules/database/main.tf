data "aws_secretsmanager_secret" "db_master" {
  name = var.db_master_secret_name
}

data "aws_secretsmanager_secret_version" "db_master" {
  secret_id = data.aws_secretsmanager_secret.db_master.id
}

locals {
  db_master_creds = jsondecode(data.aws_secretsmanager_secret_version.db_master.secret_string)
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.project_name}-db-subnets"
  subnet_ids = var.private_subnet_ids

  tags = { Name = "${var.project_name}-db-subnets" }
}

resource "aws_kms_key" "db" {
  description             = "${var.project_name} Aurora encryption key"
  deletion_window_in_days = 30
  enable_key_rotation     = true
}

resource "aws_rds_cluster" "this" {
  cluster_identifier = "${var.project_name}-${var.environment}"

  engine         = "aurora-postgresql"
  engine_mode    = "provisioned" # Serverless v2 runs under the "provisioned" cluster mode
  engine_version = "16.4"

  database_name   = var.db_name
  master_username = local.db_master_creds.username
  master_password = local.db_master_creds.password

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [var.database_security_group_id]

  storage_encrypted = true
  kms_key_id        = aws_kms_key.db.arn

  storage_type = "aurora-iopt1" # I/O-Optimized — predictable billing, see docs/Unified-Infrastructure-Architecture.md #3

  backup_retention_period      = 7
  preferred_backup_window      = "01:00-03:00"
  preferred_maintenance_window = "sun:03:30-sun:05:00"

  serverlessv2_scaling_configuration {
    min_capacity = var.db_min_acu
    max_capacity = var.db_max_acu
  }

  skip_final_snapshot = false
  final_snapshot_identifier = "${var.project_name}-${var.environment}-final"

  deletion_protection = var.environment == "production"
}

resource "aws_rds_cluster_instance" "writer" {
  identifier         = "${var.project_name}-${var.environment}-writer"
  cluster_identifier = aws_rds_cluster.this.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.this.engine
  engine_version     = aws_rds_cluster.this.engine_version
}

# Read replicas — zero at Stage 0/1. Raising db_read_replica_count in a
# later environment's .tfvars adds instances to this same cluster; it does
# not create a new database or require any data migration.
resource "aws_rds_cluster_instance" "readers" {
  count              = var.db_read_replica_count
  identifier         = "${var.project_name}-${var.environment}-reader-${count.index}"
  cluster_identifier = aws_rds_cluster.this.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.this.engine
  engine_version     = aws_rds_cluster.this.engine_version
}
