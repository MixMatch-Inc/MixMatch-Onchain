variable "aws_region" {
  description = "AWS region for the environment."
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name used in resource names and tags."
  type        = string
  default     = "staging"
}

variable "vpc_id" {
  description = "Existing VPC to deploy into."
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnets for the database and (later) the ECS tasks."
  type        = list(string)
}

variable "db_instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t4g.medium"
}

variable "db_allocated_storage_gb" {
  description = "Initial RDS storage in GiB."
  type        = number
  default     = 20
}

variable "db_username" {
  description = "Master username for the database."
  type        = string
  default     = "mixmatch"
}

variable "app_security_group_ids" {
  description = "Security groups of the application tasks that may reach the database."
  type        = list(string)
  default     = []
}
