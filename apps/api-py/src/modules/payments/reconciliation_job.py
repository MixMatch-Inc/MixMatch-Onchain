import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession

from src.core.database import AsyncSessionLocal, engine as default_engine
from src.core.metrics import reconciliation_metrics
from src.db.models import Transaction
from src.modules.payments.locks import ReconciliationLock, lock_for
from src.modules.payments.service import PaymentsService

try:  # Prometheus export lives in src.core.prometheus (request-metrics work); optional here.
    from src.core.prometheus import set_reconciliation_health
except ImportError:  # pragma: no cover - exercised only before that module exists
    set_reconciliation_health = None

logger = logging.getLogger("reconciliation.job")

MAX_RECONCILIATION_ATTEMPTS = 5


def _as_utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


class ReconciliationJob:
    """Background reconciliation job. At most one instance reconciles at a time (see ``locks``)."""

    def __init__(
        self,
        session_factory: Optional[async_sessionmaker[AsyncSession]] = None,
        poll_interval_seconds: float = 30.0,
        lock: Optional[ReconciliationLock] = None,
    ):
        self.session_factory = session_factory or AsyncSessionLocal
        self.poll_interval_seconds = poll_interval_seconds
        # The lock must match the database the sessions use, not the process-wide default.
        bind = getattr(self.session_factory, "kw", {}).get("bind", default_engine)
        self._lock = lock or lock_for(bind)
        self._running = False
        self._task: Optional[asyncio.Task] = None

    async def _pending_stats(self, session: AsyncSession) -> tuple[int, Optional[float]]:
        """How many transactions are still PENDING and how old the oldest one is, in seconds."""
        result = await session.execute(
            select(func.count(), func.min(Transaction.created_at)).where(Transaction.status == "PENDING")
        )
        count, oldest = result.one()
        age = None if oldest is None else max((datetime.now(timezone.utc) - _as_utc(oldest)).total_seconds(), 0.0)
        return int(count), age

    async def run_once(self) -> int:
        """Executes a single reconciliation cycle if this caller wins the cross-process lock."""
        reconciliation_metrics.record_tick()

        if not await self._lock.acquire():
            logger.info("Reconciliation already running in another worker or instance. Skipping.")
            return 0

        try:
            logger.info("Acquired reconciliation lock. Starting cycle...")
            async with self.session_factory() as session:
                service = PaymentsService(session_factory=self.session_factory, concurrency_limit=5)
                reconciled = await service.reconcile_pending_transactions()
                backlog, oldest_age = await self._pending_stats(session)

            reconciliation_metrics.record_cycle(backlog, oldest_age)
            if set_reconciliation_health is not None:
                set_reconciliation_health(
                    backlog=backlog,
                    oldest_pending_age_seconds=oldest_age if oldest_age is not None else 0.0,
                    last_run_timestamp=datetime.now(timezone.utc).timestamp(),
                )
            logger.info(
                "Completed reconciliation cycle: %d processed, %d still pending",
                len(reconciled),
                backlog,
                extra={"processed": len(reconciled), "backlog": backlog, "oldest_pending_age_seconds": oldest_age},
            )
            return len(reconciled)
        finally:
            await self._lock.release()

    async def _loop(self):
        while self._running:
            try:
                await self.run_once()
            except Exception as e:
                logger.error("Error during scheduled reconciliation job: %s", e, exc_info=True)
                reconciliation_metrics.record_tick()
            await asyncio.sleep(self.poll_interval_seconds)

    def start(self):
        if not self._running:
            self._running = True
            self._task = asyncio.create_task(self._loop())
            logger.info("ReconciliationJob started with interval %s s", self.poll_interval_seconds)

    def stop(self):
        if self._running:
            self._running = False
            if self._task:
                self._task.cancel()
            logger.info("ReconciliationJob stopped")
