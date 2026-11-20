# Terraform

One root module per environment (`staging/` today). See `docs/decisions/hosting-target.md` for the
hosting decision this implements (status: proposed).

```bash
cd infra/terraform/staging
terraform init -backend-config="bucket=<state-bucket>" -backend-config="key=staging/terraform.tfstate" \
  -backend-config="region=us-east-1" -backend-config="dynamodb_table=<lock-table>"
terraform plan -var vpc_id=vpc-... -var 'private_subnet_ids=["subnet-...","subnet-..."]'
```

## What exists

ECR repositories (api, web), CloudWatch log groups, empty Secrets Manager secrets, an ECS cluster
with its task execution role, and an RDS PostgreSQL 16 instance with its security group.

## What does not exist yet

The ALB and listeners, ECS task definitions and services, DNS, Vault, and a `production/` root
module. Staging cannot be recreated end to end from this code until those are added.
