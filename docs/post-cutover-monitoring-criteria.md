# Post-Cutover Monitoring & Decommissioning Criteria

## Purpose
Establishes the quantitative criteria that must be satisfied for **7 consecutive days** post-cutover before the legacy NestJS backend (`apps/api`) may be safely decommissioned.

## Evaluation Period
- **Duration**: 7 full days (168 hours) under 100% production traffic.

## Service Level Indicators (SLIs) & Objectives (SLOs)

| Metric | Target | Failure Action |
| :--- | :--- | :--- |
| **Availability (HTTP 5xx)** | < 0.05% across all routes | Pause decommissioning, investigate logs |
| **P50 Latency** | < 45ms | Review query execution plans |
| **P95 Latency** | < 150ms | Review DB connection pool limits |
| **P99 Latency** | < 400ms | Optimize Horizon client connection pooling |
| **SSE Connection Stability** | Mean session duration > 10m | Check client keepalive heartbeats |
| **Reconciliation Backlog** | 0 pending transactions older than 10m | Investigate reconciliation background worker |
| **Database Pool Exhaustion** | 0 pool timeout exceptions | Adjust max_overflow |

## Decommissioning Sign-Off
Once all criteria pass continuously for 7 days, Tech Lead and DevOps sign off on executing `scripts/decommission_nestjs.sh`.
