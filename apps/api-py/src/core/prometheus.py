"""Prometheus metrics that stay correct with several uvicorn workers (#1455).

Each worker is its own process, so in-process counters would diverge. ``prometheus_client`` solves
this with *multiprocess mode*: every process writes its samples to files in
``PROMETHEUS_MULTIPROC_DIR`` and ``/metrics`` aggregates them at scrape time. The variable must be
set before ``prometheus_client`` is first imported, which is why it is defaulted at the top of this
module. Point it at a directory that is empty at container start (for example a tmpfs).

Metric names and labels are what ``infra/monitoring`` alert rules and dashboards use; change them together.
"""

import os
import tempfile
import time
from pathlib import Path
from typing import Any, AsyncIterator, Optional

DEFAULT_MULTIPROC_DIR = os.path.join(tempfile.gettempdir(), "mixmatch-prometheus")


def _prepare_multiprocess_dir() -> bool:
    directory = os.environ.setdefault("PROMETHEUS_MULTIPROC_DIR", DEFAULT_MULTIPROC_DIR)
    try:
        os.makedirs(directory, exist_ok=True)
        return os.access(directory, os.W_OK)
    except OSError:
        return False


MULTIPROCESS = _prepare_multiprocess_dir()
if not MULTIPROCESS:
    # An unwritable directory would crash metric creation; fall back to single-process metrics.
    os.environ.pop("PROMETHEUS_MULTIPROC_DIR", None)

from prometheus_client import (  # noqa: E402  (must follow the environment setup above)
    CONTENT_TYPE_LATEST,
    REGISTRY,
    CollectorRegistry,
    Counter,
    Gauge,
    Histogram,
    generate_latest,
    multiprocess,
)

# Buckets include the SLO boundaries in docs/post-cutover-monitoring-criteria.md (45ms, 150ms, 400ms).
LATENCY_BUCKETS = (0.005, 0.01, 0.025, 0.045, 0.075, 0.1, 0.15, 0.25, 0.4, 0.5, 1.0, 2.5, 5.0, 10.0)
SSE_DURATION_BUCKETS = (1, 5, 30, 60, 180, 300, 600, 1200, 1800, 3600)

HTTP_REQUESTS = Counter(
    "http_requests_total", "HTTP requests handled, by method, matched route and status code.", ["method", "route", "status"]
)
HTTP_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds, by method and matched route.",
    ["method", "route"],
    buckets=LATENCY_BUCKETS,
)
SSE_CONNECTIONS = Gauge(
    "sse_connections_active", "Open server-sent-event connections.", multiprocess_mode="livesum"
)
SSE_SESSION_SECONDS = Histogram(
    "sse_session_duration_seconds", "How long server-sent-event sessions stay open.", buckets=SSE_DURATION_BUCKETS
)
DB_POOL = Gauge(
    "db_pool_connections", "Database pool connections by state (checked_out, size, overflow).", ["state"], multiprocess_mode="livesum"
)
DB_POOL_TIMEOUTS = Counter("db_pool_timeouts_total", "Requests that failed waiting for a database connection.")
RECONCILIATION_PROCESSED = Counter("reconciliation_processed_total", "Transactions processed by reconciliation.")
RECONCILIATION_FAILURES = Counter("reconciliation_failures_total", "Reconciliation attempts that failed.")

# Job health gauges are set when the job reports, not at scrape time; "mostrecent" keeps the newest
# value across workers instead of summing or taking a stale maximum.
RECONCILIATION_BACKLOG = Gauge(
    "reconciliation_pending_transactions", "PENDING transactions waiting for reconciliation.", multiprocess_mode="mostrecent"
)
RECONCILIATION_OLDEST_PENDING = Gauge(
    "reconciliation_oldest_pending_age_seconds", "Age of the oldest PENDING transaction.", multiprocess_mode="mostrecent"
)
RECONCILIATION_LAST_RUN = Gauge(
    "reconciliation_last_run_timestamp_seconds", "Unix time of the last reconciliation cycle (heartbeat).", multiprocess_mode="mostrecent"
)

_UNMATCHED = "unmatched"


def route_label(scope: dict) -> str:
    """The route template (``/api/payments/{id}``), never the raw path, to keep label cardinality bounded."""
    route = scope.get("route")
    return getattr(route, "path", None) or _UNMATCHED


def update_db_pool_gauges(engine: Any) -> None:
    pool = getattr(getattr(engine, "sync_engine", engine), "pool", None)
    for state, getter in (("checked_out", "checkedout"), ("size", "size"), ("overflow", "overflow")):
        read = getattr(pool, getter, None)
        if callable(read):
            try:
                DB_POOL.labels(state=state).set(read())
            except Exception:  # pools without these counters (SQLite) are simply not reported
                pass


def set_reconciliation_health(
    backlog: Optional[int] = None, oldest_pending_age_seconds: Optional[float] = None, last_run_timestamp: Optional[float] = None
) -> None:
    """Called by the reconciliation job after each cycle."""
    if backlog is not None:
        RECONCILIATION_BACKLOG.set(backlog)
    if oldest_pending_age_seconds is not None:
        RECONCILIATION_OLDEST_PENDING.set(oldest_pending_age_seconds)
    if last_run_timestamp is not None:
        RECONCILIATION_LAST_RUN.set(last_run_timestamp)


def observe_reconciliation(success: bool) -> None:
    RECONCILIATION_PROCESSED.inc()
    if not success:
        RECONCILIATION_FAILURES.inc()


async def track_sse(events: AsyncIterator[Any]) -> AsyncIterator[Any]:
    """Wrap an SSE event generator: counts the open connection and records how long it lasted."""
    started = time.perf_counter()
    SSE_CONNECTIONS.inc()
    try:
        async for event in events:
            yield event
    finally:
        SSE_CONNECTIONS.dec()
        SSE_SESSION_SECONDS.observe(time.perf_counter() - started)


class PrometheusMiddleware:
    """Pure ASGI middleware recording request count and latency by matched route."""

    def __init__(self, app, skip_paths: tuple[str, ...] = ("/metrics",)):
        self.app = app
        self.skip_paths = skip_paths

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope.get("path") in self.skip_paths:
            await self.app(scope, receive, send)
            return

        started = time.perf_counter()
        status_code = 500

        async def send_wrapper(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        except Exception as error:
            if type(error).__name__ == "TimeoutError" and type(error).__module__.startswith("sqlalchemy"):
                DB_POOL_TIMEOUTS.inc()
            raise
        finally:
            route = route_label(scope)
            method = scope.get("method", "GET")
            HTTP_REQUESTS.labels(method=method, route=route, status=str(status_code)).inc()
            HTTP_LATENCY.labels(method=method, route=route).observe(time.perf_counter() - started)


def registry_for_scrape() -> CollectorRegistry:
    if MULTIPROCESS:
        registry = CollectorRegistry()
        multiprocess.MultiProcessCollector(registry)
        return registry
    return REGISTRY


def render_metrics(engine: Any = None) -> tuple[bytes, str]:
    if engine is not None:
        update_db_pool_gauges(engine)
    return generate_latest(registry_for_scrape()), CONTENT_TYPE_LATEST


def _pid_alive(pid: int) -> bool:
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


def cleanup_dead_process_files() -> int:
    """Drop gauge files of workers that no longer exist so ``livesum`` gauges do not count them.

    Returns how many processes were cleaned. Counter and histogram files are kept on purpose: their
    totals must survive a worker restart.
    """
    if not MULTIPROCESS:
        return 0
    dead = set()
    for path in Path(os.environ["PROMETHEUS_MULTIPROC_DIR"]).glob("*.db"):
        suffix = path.stem.rsplit("_", 1)[-1]
        if suffix.isdigit() and not _pid_alive(int(suffix)):
            dead.add(int(suffix))
    for pid in dead:
        multiprocess.mark_process_dead(pid)
    return len(dead)
