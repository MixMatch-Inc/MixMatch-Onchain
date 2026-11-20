terraform {
  required_version = ">= 1.9.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.80"
    }
  }

  # Remote state: create the bucket and lock table once, then `terraform init -backend-config=...`.
  backend "s3" {}
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "mixmatch"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
