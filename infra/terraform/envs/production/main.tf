terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "project" {
  description = "Project name prefix"
  type        = string
  default     = "veo3"
}

module "s3_assets" {
  source      = "../../modules/s3"
  bucket_name = "${var.project}-assets-${var.environment}"
  environment = var.environment
  project     = var.project
}

module "elasticache_redis" {
  source          = "../../modules/elasticache"
  cluster_id      = "${var.project}-redis-${var.environment}"
  node_type       = "cache.r7g.large"
  num_cache_nodes = 1
  environment     = var.environment
  project         = var.project
}

module "waf" {
  source      = "../../modules/waf"
  name        = "${var.project}-waf-${var.environment}"
  environment = var.environment
  project     = var.project
}

output "s3_bucket_name" {
  value = module.s3_assets.bucket_name
}

output "redis_endpoint" {
  value     = module.elasticache_redis.primary_endpoint
  sensitive = true
}

output "waf_acl_arn" {
  value = module.waf.acl_arn
}
