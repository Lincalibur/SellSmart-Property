variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "document_retention_years" {
  type = number
}

variable "enable_lifecycle_transition" {
  type    = bool
  default = false
}
