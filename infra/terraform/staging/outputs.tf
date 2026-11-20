output "ecr_repository_urls" {
  description = "Push images here, keyed by service."
  value       = { for name, repo in aws_ecr_repository.service : name => repo.repository_url }
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "task_execution_role_arn" {
  value = aws_iam_role.task_execution.arn
}

output "database_endpoint" {
  value = aws_db_instance.main.address
}

output "secret_arns" {
  description = "Populate these with `aws secretsmanager put-secret-value`."
  value       = { for name, secret in aws_secretsmanager_secret.app : name => secret.arn }
}
