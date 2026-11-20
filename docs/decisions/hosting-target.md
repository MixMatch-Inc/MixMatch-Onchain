# Hosting target and infrastructure as code

Status: **proposed** (needs a maintainer decision before the Terraform in `infra/terraform` is applied)

## Context

The docs mention an AWS ALB for traffic shifting, Aurora or Supabase for the database and
Kubernetes auth for Vault, but the repository only contained an nginx traffic-split sample. Nothing
described where the API and web app actually run, so staging could not be recreated from code.

## Options

| Option | Pros | Cons |
| --- | --- | --- |
| **AWS ECS Fargate + ALB + RDS PostgreSQL (recommended)** | No cluster to operate; ALB weighted target groups already match the rollback runbook; RDS supports `pgvector`; ECR, Secrets Manager and CloudWatch cover images, secrets and logs | AWS lock-in; Vault stays a separate service (HCP Vault or self-hosted) |
| Kubernetes (EKS/GKE) + Helm | Matches the Vault Kubernetes-auth docs; portable | Highest operational cost for a two-service app |
| PaaS (Fly.io, Render) + managed Postgres | Fastest to stand up | Weaker fit for private Vault access and ALB-style traffic shifting; less IaC coverage |

## Decision (proposed)

Run the API (`apps/api-py`) and web (`apps/web`) images on ECS Fargate behind an ALB, with RDS
PostgreSQL 16 (pgvector enabled), secrets in AWS Secrets Manager, images in ECR and logs in
CloudWatch. Terraform lives in `infra/terraform/<environment>`; there is one root module per
environment so staging and production can differ in size but not in shape.

## Consequences

- `infra/terraform/staging` defines the foundation (ECR, logs, secrets, ECS cluster and execution
  role, RDS and its security group). The ALB, ECS services and task definitions are not written yet.
- Secret values are never in Terraform state from code: secrets are created empty and populated
  out of band (`aws secretsmanager put-secret-value`).
- If maintainers pick Kubernetes instead, replace `infra/terraform` with a Helm chart under
  `infra/helm`; the container images and environment variables stay the same.
