import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional

logger = logging.getLogger("metrics.reconciliation")

class ReconciliationMetricsCollector:
    """Port #1137: Collects reconciliation metrics and emits alerts when failure rate exceeds threshold."""

    def __init__(self, failure_rate_threshold: float = 0.20):
        self.total_processed = 0
        self.total_failures = 0
        self.failure_rate_threshold = failure_rate_threshold
        self.alert_triggered = False
        # Job health (#1460). ``last_tick_at`` proves the loop on THIS instance is alive (it moves even
        # when another instance holds the lock); ``last_run_at`` is when a cycle actually completed here.
        self.last_tick_at: Optional[datetime] = None
        self.last_run_at: Optional[datetime] = None
        self.backlog: Optional[int] = None
        self.oldest_pending_age_seconds: Optional[float] = None

    def record_success(self):
        self.total_processed += 1
        self._check_alerts()

    def record_failure(self, tx_id: str, reason: str):
        self.total_processed += 1
        self.total_failures += 1
        logger.warning("Reconciliation failure recorded for tx %s: %s", tx_id, reason)
        self._check_alerts()

    def record_tick(self, now: Optional[datetime] = None) -> None:
        """Heartbeat: the job loop woke up, whether or not it won the lock."""
        self.last_tick_at = now or datetime.now(timezone.utc)

    def record_cycle(
        self, backlog: int, oldest_pending_age_seconds: Optional[float], now: Optional[datetime] = None
    ) -> None:
        """A reconciliation cycle completed: remember how much is still PENDING and for how long."""
        self.last_run_at = now or datetime.now(timezone.utc)
        self.backlog = backlog
        self.oldest_pending_age_seconds = oldest_pending_age_seconds

    def is_stalled(self, max_silence_seconds: float, now: Optional[datetime] = None) -> bool:
        """True when the loop has not ticked for ``max_silence_seconds`` (or never ticked)."""
        if self.last_tick_at is None:
            return True
        current = now or datetime.now(timezone.utc)
        return (current - self.last_tick_at).total_seconds() > max_silence_seconds

    def snapshot(self) -> Dict[str, Any]:
        return {
            "last_tick_at": self.last_tick_at.isoformat() if self.last_tick_at else None,
            "last_run_at": self.last_run_at.isoformat() if self.last_run_at else None,
            "backlog": self.backlog,
            "oldest_pending_age_seconds": self.oldest_pending_age_seconds,
            "total_processed": self.total_processed,
            "total_failures": self.total_failures,
            "failure_rate": self.failure_rate,
        }

    @property
    def failure_rate(self) -> float:
        if self.total_processed == 0:
            return 0.0
        return self.total_failures / self.total_processed

    def _check_alerts(self):
        # Trigger alert if minimum sample size met and failure rate above threshold
        if self.total_processed >= 5 and self.failure_rate >= self.failure_rate_threshold:
            self.alert_triggered = True
            logger.critical(
                "ALERT: High reconciliation failure rate detected! rate=%.2f%% (threshold=%.2f%%, failures=%d, total=%d)",
                self.failure_rate * 100,
                self.failure_rate_threshold * 100,
                self.total_failures,
                self.total_processed,
            )

    def reset(self):
        self.total_processed = 0
        self.total_failures = 0
        self.alert_triggered = False
        self.last_tick_at = None
        self.last_run_at = None
        self.backlog = None
        self.oldest_pending_age_seconds = None

reconciliation_metrics = ReconciliationMetricsCollector()
