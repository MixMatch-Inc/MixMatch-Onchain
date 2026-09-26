import asyncio
import logging
from typing import Optional
from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession
from src.modules.payments.service import PaymentsService
from src.core.database import AsyncSessionLocal

logger = logging.getLogger("reconciliation.job")

MAX_RECONCILIATION_ATTEMPTS = 5

# Shared distributed lock across multiple app instances
_DISTRIBUTED_RECONCILIATION_LOCK = asyncio.Lock()

class ReconciliationJob:
   
    def __init__(
        self,
        session_factory: Optional[async_sessionmaker[AsyncSession]] = None,
        poll_interval_seconds: float = 30.0,
    ):
        self.session_factory = session_factory or AsyncSessionLocal
        self.poll_interval_seconds = poll_interval_seconds
        self._running = False
        self._task: Optional[asyncio.Task] = None

    async def run_once(self) -> int:
        """Executes a single reconciliation cycle."""
        logger.info("Starting background reconciliation cycle...")
        async with self.session_factory() as session:
            service = PaymentsService(session_factory=self.session_factory, concurrency_limit=5)
            reconciled = await service.reconcile_pending_transactions()
            logger.info("Completed reconciliation cycle: %d transactions processed", len(reconciled))
            return len(reconciled)

    async def _loop(self):
        while self._running:
            try:
                await self.run_once()
            except Exception as e:
                logger.error("Error during scheduled reconciliation job: %s", e, exc_info=True)
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
