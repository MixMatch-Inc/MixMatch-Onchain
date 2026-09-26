import logging
from datetime import datetime, timezone
from typing import Dict, Any

logger = logging.getLogger("metrics.reconciliation")

class ReconciliationMetricsCollector:
    """Port #1137: Collects reconciliation metrics and emits alerts when failure rate exceeds threshold."""

    def __init__(self, failure_rate_threshold: float = 0.20):
        self.total_processed = 0
        self.total_failures = 0
        self.failure_rate_threshold = failure_rate_threshold
        self.alert_triggered = False

    def record_success(self):
        self.total_processed += 1
        self._check_alerts()

    def record_failure(self, tx_id: str, reason: str):
        self.total_processed += 1
        self.total_failures += 1
        logger.warning("Reconciliation failure recorded for tx %s: %s", tx_id, reason)
        self._check_alerts()

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

reconciliation_metrics = ReconciliationMetricsCollector()
