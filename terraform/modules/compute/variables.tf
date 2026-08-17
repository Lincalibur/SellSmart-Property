variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "public_subnet_ids" {
  type = list(string)
}

variable "app_security_group_id" {
  type = string
}

variable "alb_security_group_id" {
  type = string
}

variable "app_image" {
  type = string
}

variable "app_task_cpu" {
  type = number
}

variable "app_task_memory" {
  type = number
}

variable "app_desired_count" {
  type = number
}
