# Cutover Rollback Runbook & Safety Protocols

## Overview
This runbook provides emergency reversion procedures in the event of critical regressions, high error rates, or data divergence after cutover to the FastAPI backend.

## Rollback Triggers
Initiate rollback immediately if any of the following occur during the 7-day observation window:
1. **HTTP 5xx Error Rate**: Exceeds 0.5% over a 15-minute sliding window.
2. **P95 Latency Spike**: Exceeds 500ms on core payment and escrow endpoints.
3. **Reconciliation Divergence**: Blockchain payment reconciliation reports repeated double-spend or dropped webhook discrepancies.
4. **KMS / Key Rotation Failure**: Transaction signing fails with non-recoverable Vault transit errors.

## Execution Steps

### Step 1: Revert Traffic Routing
Shift 100% of traffic back to the standby NestJS cluster:
- **Nginx Reverse Proxy**:
  Update `infra/nginx/traffic-split.conf`:
  ```nginx
  split_clients "${remote_addr}" $upstream_choice {
      100%    nestjs_backend;
  }
  ```
  Reload Nginx: `nginx -s reload`
- **AWS Route53 / ALB**: Shift weighted target group to 100% NestJS target group.

### Step 2: Database Reversibility Check
- Database migrations implemented during FastAPI migration are **strictly additive** (new columns and composite indices only).
- No tables, foreign keys, or columns were dropped or renamed.
- The legacy NestJS Drizzle ORM remains fully operational against the existing database without requiring reverse migrations.

### Step 3: Verification & Health Check
- Run automated contract parity test:
  ```bash
  python scripts/contract_parity_test.py http://api.mixmatch.app
  ```
- Verify NestJS health endpoint: `GET https://api.mixmatch.app/health`
- Check active transaction processing logs.
