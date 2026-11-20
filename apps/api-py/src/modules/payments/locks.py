"""Mutual exclusion for the reconciliation job across processes and instances (#1461).

On PostgreSQL the lock is a *session-level advisory lock* held on a dedicated connection, so it is
shared by every worker and every instance talking to the same database, and it disappears by itself
if the holder crashes (the connection, and with it the session, goes away). On other databases
(SQLite in development and tests) there is only ever one process, so an in-process lock is enough.
"""

import asyncio
import logging
from typing import Any, Optional, Protocol

from sqlalchemy import text

logger = logging.getLogger("reconciliation.lock")

# Arbitrary but fixed 64-bit key; every instance must use the same one. Spells "recon" in ASCII.
RECONCILIATION_LOCK_KEY = 0x7265636F6E


class ReconciliationLock(Protocol):
    async def acquire(self) -> bool:
        """Try to take the lock without waiting. True if this caller now holds it."""

    async def release(self) -> None:
        """Release the lock if this caller holds it."""


class LocalProcessLock:
    """Single-process fallback. All instances in the process share one ``asyncio.Lock``."""

    _lock = asyncio.Lock()

    def __init__(self) -> None:
        self._held = False

    async def acquire(self) -> bool:
        if self._lock.locked():
            return False
        await self._lock.acquire()
        self._held = True
        return True

    async def release(self) -> None:
        if self._held:
            self._held = False
            self._lock.release()


class PostgresAdvisoryLock:
    """``pg_try_advisory_lock`` on a connection that is kept open until ``release``."""

    def __init__(self, engine: Any, key: int = RECONCILIATION_LOCK_KEY) -> None:
        self._engine = engine
        self._key = key
        self._connection: Optional[Any] = None

    async def acquire(self) -> bool:
        if self._connection is not None:
            return False  # this holder already owns it
        connection = await self._engine.connect()
        try:
            result = await connection.execute(text("SELECT pg_try_advisory_lock(:key)"), {"key": self._key})
            acquired = bool(result.scalar())
        except Exception:
            await connection.close()
            raise
        if not acquired:
            await connection.close()
            return False
        self._connection = connection
        return True

    async def release(self) -> None:
        connection, self._connection = self._connection, None
        if connection is None:
            return
        try:
            await connection.execute(text("SELECT pg_advisory_unlock(:key)"), {"key": self._key})
            await connection.close()
        except Exception:
            # If the unlock failed, make sure the session ends: closing the underlying connection releases the lock.
            logger.warning("advisory unlock failed; invalidating the connection", exc_info=True)
            try:
                await connection.invalidate()
            finally:
                await connection.close()


def lock_for(engine: Any) -> ReconciliationLock:
    """Pick the lock implementation that matches the database behind ``engine``."""
    dialect = getattr(getattr(engine, "dialect", None), "name", "")
    if dialect == "postgresql":
        return PostgresAdvisoryLock(engine)
    return LocalProcessLock()
