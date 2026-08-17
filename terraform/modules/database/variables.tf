variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "database_security_group_id" {
  type = string
}

variable "db_name" {
  type = string
}

variable "db_min_acu" {
  type = number
}

variable "db_max_acu" {
  type = number
}

variable "db_read_replica_count" {
  type = number
}

variable "db_master_secret_name" {
  type = string
}
