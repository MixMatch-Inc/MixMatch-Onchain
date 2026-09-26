# Test Database Strategy & Guidelines

## Overview
This document specifies the database isolation and testing strategy for the MixMatch FastAPI backend.

## Three-Tier Strategy

### Tier 1: Unit & Router Tests (Fast Hermetic Tier)
- **Engine**: In-memory SQLite (\`sqlite+aiosqlite:///:memory:\`).
- **Isolation**: Each test runs with a fresh ephemeral engine or session rollback via \`shared_db_session\` in \`conftest.py\`.
- **Target Execution Time**: < 5 seconds for the entire test suite.
- **Scope**: Validation logic, state machines, business logic, authorization guards.

### Tier 2: Integration & Contract Parity Tests (PostgreSQL CI Container)
- **Engine**: Real PostgreSQL 16 container running in GitHub Actions CI (\`services.postgres\`).
- **Isolation**: Migration runner applies all Alembic revisions before test execution; transactions are rolled back after each test case.
- **Scope**: Foreign key cascaded deletions, dialect-specific JSON queries, composite indexing verification.

### Tier 3: Staging & Load Testing
- **Engine**: Managed AWS Aurora / Supabase PostgreSQL matching production.
- **Scope**: Concurrency stress testing, connection pool exhaustion analysis, SSE subscription scale.
