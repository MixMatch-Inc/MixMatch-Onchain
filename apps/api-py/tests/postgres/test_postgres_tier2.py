"""Tier 2 (PostgreSQL) smoke suite. Run with ``pytest -m postgres`` and TEST_DATABASE_URL set.

Skipped unless TEST_DATABASE_URL points at a PostgreSQL database (docs/test-database-strategy.md).
"""

import asyncio
import os

import pytest
from alembic import command
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from src.db.migrate import build_config

pytestmark = pytest.mark.postgres

URL = os.environ.get("TEST_DATABASE_URL", "")

if not URL.startswith("postgresql"):
    pytest.skip("TEST_DATABASE_URL is not a PostgreSQL URL", allow_module_level=True)


async def _table_names() -> set[str]:
    engine = create_async_engine(URL)
    try:
        async with engine.connect() as connection:
            rows = await connection.execute(
                text("select table_name from information_schema.tables where table_schema = 'public'")
            )
            return {row[0] for row in rows}
    finally:
        await engine.dispose()


async def _select_one() -> int:
    engine = create_async_engine(URL)
    try:
        async with engine.connect() as connection:
            return (await connection.execute(text("select 1"))).scalar_one()
    finally:
        await engine.dispose()


def test_database_is_reachable():
    assert asyncio.run(_select_one()) == 1


def test_migrations_apply_and_create_the_schema():
    command.upgrade(build_config(URL), "head")
    tables = asyncio.run(_table_names())
    assert "alembic_version" in tables
    assert len(tables) > 1


def test_migrations_are_reversible_to_base_and_reapply():
    config = build_config(URL)
    command.upgrade(config, "head")
    command.downgrade(config, "base")
    command.upgrade(config, "head")
