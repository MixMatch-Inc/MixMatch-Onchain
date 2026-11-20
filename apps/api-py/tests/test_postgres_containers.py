"""test_postgres_containers.py – Tier-2 Postgres tests via testcontainers (issue #1466).

Mark these tests with @pytest.mark.tier2 to run only when a Docker daemon
is available (not in the standard unit-test run). They cover pool behaviour
that is skipped when DATABASE_URL is SQLite (see apps/api-py/src/core/database.py).

Usage:
    pytest apps/api-py/tests/test_postgres_containers.py -m tier2 -v

Requires: testcontainers[postgres], asyncpg or psycopg2-binary
"""
from __future__ import annotations

import pytest

# Skip the whole module if testcontainers is not installed.
testcontainers = pytest.importorskip("testcontainers", reason="testcontainers not installed")

try:
    from testcontainers.postgres import PostgresContainer  # type: ignore
except ImportError:
    pytestmark = pytest.mark.skip(reason="testcontainers[postgres] not installed")
    PostgresContainer = None  # type: ignore

pytest_tier2 = pytest.mark.tier2


@pytest_tier2
@pytest.mark.anyio
async def test_postgres_pool_connects() -> None:
    """Verify that a real Postgres engine can be created and queried."""
    with PostgresContainer("postgres:16-alpine") as pg:
        db_url = pg.get_connection_url().replace("postgresql+psycopg2", "postgresql+asyncpg")

        from sqlalchemy.ext.asyncio import create_async_engine

        engine = create_async_engine(db_url, pool_size=2, max_overflow=0)
        async with engine.connect() as conn:
            from sqlalchemy import text

            result = await conn.execute(text("SELECT 1"))
            row = result.fetchone()
        await engine.dispose()

        assert row is not None
        assert row[0] == 1


@pytest_tier2
@pytest.mark.anyio
async def test_postgres_pool_leak_detection() -> None:
    """Pool-leak test that the SQLite conftest skips (database.py branches on sqlite)."""
    with PostgresContainer("postgres:16-alpine") as pg:
        db_url = pg.get_connection_url().replace("postgresql+psycopg2", "postgresql+asyncpg")

        from sqlalchemy.ext.asyncio import create_async_engine

        # pool_size=1 so a leaked connection would block the second acquire
        engine = create_async_engine(db_url, pool_size=1, max_overflow=0, pool_timeout=2)

        async with engine.connect():
            pass  # connection returned to pool

        # Second connect must succeed immediately (no leak)
        async with engine.connect() as conn:
            from sqlalchemy import text

            await conn.execute(text("SELECT 1"))

        await engine.dispose()
