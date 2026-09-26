import asyncio
import logging
from typing import Optional
from src.core.config import settings
from src.modules.taste.service import TasteService

logger = logging.getLogger("taste.cron")

class TasteCronScheduler:
    """
    Port #1146: Taste cron scheduling gated by ENABLE_TASTE_CRON config.
    Wraps service call in robust try/except to prevent unhandled scheduler crashes.
    """

    def __init__(self, service: Optional[TasteService] = None):
        self.service = service or TasteService()
        self.is_running = False
        self._task: Optional[asyncio.Task] = None

    async def run_job_callback(self) -> bool:
        """Callback executed on schedule with error handling."""
        try:
            processed_count = await self.service.execute_nightly_computation_batch()
            logger.info("Taste cron job completed successfully, processed %d profiles", processed_count)
            return True
        except Exception as e:
            # Port #1146: Gap fix - catch all exceptions around service call
            logger.error("Taste cron job execution failed: %s", str(e), exc_info=True)
            return False

    def start(self) -> bool:
        if not settings.ENABLE_TASTE_CRON:
            logger.info("Taste cron is disabled by configuration (ENABLE_TASTE_CRON=False). Scheduler not started.")
            return False
        self.is_running = True
        return True

    def stop(self) -> None:
        self.is_running = False
        if self._task and not self._task.done():
            self._task.cancel()
