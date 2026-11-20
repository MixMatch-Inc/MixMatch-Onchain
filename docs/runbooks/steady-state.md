# Steady-State Operations Runbook

> Issue #1483 – covers Horizon outage, Vault outage, stuck PENDING backlog,
> NEEDS_REVIEW triage, SSE storm, and Postgres backup/restore.

## Severity Levels

| Level | Description | On-call Response |
|---|---|---|
| P0 | Complete outage (payments, auth, Vault) | Page primary + backup immediately |
| P1 | Degraded (high latency, partial failures) | Page primary within 15 min |
| P2 | Minor (single non-critical service) | Ticket; fix within 24 h |
| P3 | Cosmetic / docs | Next sprint |

## Horizon Outage

1. Check `GET /health` on `https://horizon-testnet.stellar.org` (or mainnet).
2. `apps/api-py/src/stellar/client.py` – confirm `circuit_breaker` has tripped (look for `CircuitBreakerOpen` in logs).
3. Set `HORIZON_URL` to a fallback provider (SDF or Blockdaemon).
4. Restart the API: `docker compose restart api-py`.
5. Monitor reconciliation job logs for PENDING transactions.

## Vault Outage

1. All KMS operations will fail with `VaultUnavailable`. Auth continues with cached JWTs.
2. Trigger the break-glass procedure only for P0 (see `docs/threat-model.md`).
3. If Vault unseals but AppRole token has expired: re-generate via `vault write auth/approle/login`.
4. After restore, run `kms_sync.py` to verify no key-use gaps in the audit log.

## Stuck PENDING Backlog

1. Query: `SELECT id, created_at, status FROM payments WHERE status='PENDING' AND created_at < NOW() - INTERVAL '10 minutes';`
2. If Horizon confirms success → update status to COMPLETED.
3. If Horizon confirms failure → update to FAILED; notify user.
4. If Horizon is unreachable → leave PENDING; `ReconciliationJob` will retry on next tick.

## NEEDS_REVIEW Triage

Admin panel query:
```sql
SELECT id, amount, currency, flagged_reason, created_at
FROM payments WHERE status='NEEDS_REVIEW'
ORDER BY created_at ASC;
```
Each row must be approved or rejected within 24 h. Write an `audit_log` row for every decision.

## SSE Storm

If SSE connection count spikes (monitor `streaming_active_connections` metric):
1. Enable `RATE_LIMIT_SSE=true` in environment.
2. Restart the API workers – existing connections are dropped gracefully.
3. Identify the offending client via `request_id` in the access log.

## Postgres Backup and Restore

### Scheduled Backup

```bash
pg_dump $DATABASE_URL | gzip > backup-$(date +%Y%m%dT%H%M%S).sql.gz
# Upload to S3 or equivalent
aws s3 cp backup-*.sql.gz s3://mixmatch-backups/postgres/
```

### Point-in-Time Restore Drill (run monthly)

```bash
# 1. Provision a fresh Postgres instance
# 2. Restore the latest backup
gunzip -c backup-<timestamp>.sql.gz | psql $RESTORE_DATABASE_URL
# 3. Verify row counts match production snapshot
psql $RESTORE_DATABASE_URL -c 'SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM payments;'
# 4. Record outcome in this runbook under "Drill Log" below
```

### Drill Log

| Date | Operator | Outcome | Notes |
|---|---|---|---|
| _(not yet performed)_ | — | — | — |
