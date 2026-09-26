# Traffic-Splitting & Canary Cutover Runbook

## Strategy
To avoid a risky "big bang" cutover, API traffic is gradually shifted using Nginx `split_clients` / AWS ALB weighted target groups:

1. **Phase 1: Canary 5%** (Day 1)
   - Route internal QA, automated monitors, and 5% of anonymous traffic to FastAPI.
   - Monitor error rate, DB connection pool saturation, and SSE reconnect loops.
2. **Phase 2: Partial 25%** (Day 2)
   - Increase traffic to 25%.
   - Validate reconciliation job multi-instance locks and Horizon webhooks.
3. **Phase 3: Majority 50%** (Day 3-4)
   - Equal traffic distribution between services.
4. **Phase 4: Full Cutover 100%** (Day 5+)
   - All traffic directed to FastAPI (`fastapi_backend`).
   - NestJS instances kept on standby for 7 days before decommissioning.
