variable "cluster_id" { type = string }
variable "node_type" { type = string }
variable "num_cache_nodes" { type = number }
variable "environment" { type = string }
variable "project" { type = string }

resource "aws_elasticache_subnet_group" "redis" {
  name       = "${var.cluster_id}-subnet-group"
  subnet_ids = data.aws_subnets.private.ids
}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

resource "aws_security_group" "redis" {
  name        = "${var.cluster_id}-sg"
  description = "Redis security group"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.default.cidr_block]
  }

  tags = {
    Project     = var.project
    Environment = var.environment
  }
}

resource "aws_elasticache_cluster" "redis" {
  cluster_id           = var.cluster_id
  engine               = "redis"
  node_type            = var.node_type
  num_cache_nodes      = var.num_cache_nodes
  parameter_group_name = "default.redis7"
  engine_version       = "7.1"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.redis.name
  security_group_ids   = [aws_security_group.redis.id]

  tags = {
    Project     = var.project
    Environment = var.environment
  }
}

output "primary_endpoint" {
  value     = aws_elasticache_cluster.redis.cache_nodes[0].address
  sensitive = true
}
