# ADR Index

> Issue #1481 – index of all architectural decisions and MADR template.

## Index

| # | Title | Status | Date |
|---|---|---|---|
| ADR-001 | [Taste Module Cron Migration](./taste-module-cron.md) | Decided | 2024 |
| ADR-002 | [FastAPI Migration from NestJS](./fastapi-migration.md) | Decided | 2024 |
| ADR-003 | [Custodial Wallets via Vault Transit](./custodial-wallets-vault.md) | Decided | 2024 |
| ADR-004 | [SSE vs WebSocket for Streaming](./sse-vs-websocket.md) | Decided | 2024 |
| ADR-005 | [Expo for Mobile](./expo-mobile.md) | Decided | 2024 |
| ADR-006 | [SQLite for Unit Tests](./sqlite-for-tests.md) | Decided | 2024 |
| ADR-007 | [Turborepo Monorepo Tooling](./turborepo-monorepo.md) | Decided | 2024 |

## MADR Template

Copy this template when writing a new ADR:

```markdown
# Architectural Decision Record: <Title>

## Status
**<Proposed | Decided | Deprecated | Superseded by ADR-XXX>**

## Context
<What is the problem or opportunity? What forces are at play?>

## Decision
<What was decided and why?>

## Consequences
<What becomes easier or harder as a result?>

## Alternatives Considered
<What other options were evaluated?>
```

## Decision Log

- **ADR-002 FastAPI Migration:** NestJS backend replaced with FastAPI for Python-native
  Stellar SDK integration, simplified async model and reduced context-switching.
- **ADR-003 Custodial Wallets:** Keys stored in Vault Transit (not raw env var) for
  rotation, audit and break-glass access control.
- **ADR-004 SSE vs WebSocket:** SSE chosen for unidirectional payment-status
  streaming; simpler infrastructure, works over HTTP/2.
- **ADR-005 Expo:** Cross-platform mobile with a single codebase; OTA updates
  without App Store review cycles.
- **ADR-006 SQLite for Tests:** In-memory SQLite keeps unit tests fast and
  dependency-free; Postgres is used for Tier 2 integration tests via testcontainers.
- **ADR-007 Turborepo:** Monorepo caching and task graph across TypeScript packages.
