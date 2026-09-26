# Architectural Decision Record: Taste Module Cron Migration

## Status
**Decided** (Disabled by default)

## Context
In the legacy NestJS backend, `apps/api/src/modules/taste/taste.service.ts` contained hardcoded mock profile computations without real database persistence, yet was registered to run nightly via `@Cron('0 0 * * *')`.
Running an artificial mock job every night wastes worker cycles, logs phantom activity, and misleads operators into believing dynamic music taste profile calculation is active.

## Decision
1. In the FastAPI backend, the taste cron job is **disabled by default**.
2. A configuration flag `ENABLE_TASTE_CRON: bool = False` is introduced in `Settings`.
3. When `ENABLE_TASTE_CRON=False`, no cron loop or scheduler is attached for taste profiling.
4. When `ENABLE_TASTE_CRON=True`, the taste scheduler will run with proper error handling and logging, ready to invoke the real taste-profile computation once implemented.

## Consequences
- Prevents misleading automated cron executions in production.
- Provides a clean configuration gateway to enable the worker when genuine taste profiling ML/data pipelines are deployed.
