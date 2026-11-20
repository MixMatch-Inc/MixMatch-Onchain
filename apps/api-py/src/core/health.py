"""Liveness and readiness probes (#1459).

- ``GET /health/live``: the process is up. Never touches dependencies, so a database outage does not
  make an orchestrator restart a healthy process. ``GET /health`` is kept as an alias.
- ``GET /health/ready``: dependencies this instance needs to serve traffic. Returns 503 when a
  *critical* check fails; non-critical ones (Horizon) are reported as ``degraded`` without pulling
  the instance out of rotation.
"""

import asyncio
import logging
from typing import Any, Awaitable, Callable, Optional

import httpx
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

from src.core.config import settings
from src.core.database import engine
from src.core.metrics import reconciliation_metrics

logger = logging.getLogger("health")

router = APIRouter()

CHECK_TIMEOUT_SECONDS = 3.0
# Vault answers 200 (active), 429 (standby), 472 (DR secondary) and 473 (performance standby) when usable;
# 501 (not initialized) and 503 (sealed) mean it cannot serve requests.
VAULT_USABLE_STATUS = {200, 429, 472, 473}

Check = Callable[[], Awaitable[dict]]


def result(status: str, detail: str = "", critical: bool = True) -> dict:
    return {"status": status, "detail": detail, "critical": critical}


async def check_database(db_engine: Any = None) -> dict:
    try:
        async with asyncio.timeout(CHECK_TIMEOUT_SECONDS):
            async with (db_engine or engine).connect() as connection:
                await connection.execute(text("SELECT 1"))
        return result("ok")
    except Exception as error:
        logger.warning("readiness: database check failed: %s", type(error).__name__)
        return result("fail", f"database unreachable ({type(error).__name__})")


async def check_horizon(url: Optional[str] = None) -> dict:
    # Horizon being down degrades payments but not the rest of the API, so it is not critical.
    target = (url or settings.HORIZON_URL).rstrip("/") + "/"
    try:
        async with httpx.AsyncClient(timeout=CHECK_TIMEOUT_SECONDS) as client:
            response = await client.get(target)
        if response.status_code < 500:
            return result("ok", critical=False)
        return result("degraded", f"horizon returned {response.status_code}", critical=False)
    except Exception as error:
        return result("degraded", f"horizon unreachable ({type(error).__name__})", critical=False)


async def check_vault(addr: Optional[str] = None) -> dict:
    address = addr if addr is not None else settings.VAULT_ADDR
    if not address:
        return result("skipped", "vault is not configured", critical=False)
    try:
        async with httpx.AsyncClient(timeout=CHECK_TIMEOUT_SECONDS) as client:
            response = await client.get(
                address.rstrip("/") + "/v1/sys/health", params={"standbyok": "true", "perfstandbyok": "true"}
            )
        if response.status_code in VAULT_USABLE_STATUS:
            return result("ok")
        return result("fail", f"vault returned {response.status_code} (sealed or uninitialized)")
    except Exception as error:
        return result("fail", f"vault unreachable ({type(error).__name__})")


async def check_reconciliation(enabled: Optional[bool] = None, poll_interval: Optional[float] = None) -> dict:
    if not (settings.ENABLE_RECONCILIATION_JOB if enabled is None else enabled):
        return result("skipped", "reconciliation job is disabled", critical=False)
    interval = poll_interval if poll_interval is not None else settings.RECONCILIATION_POLL_INTERVAL_SECONDS
    # Three missed polls (and never less than 90s) means the loop is stuck or dead.
    if reconciliation_metrics.is_stalled(max(interval * 3, 90.0)):
        return result("fail", "reconciliation loop has not run recently")
    return result("ok")


def default_checks() -> dict[str, Check]:
    return {
        "database": check_database,
        "vault": check_vault,
        "reconciliation": check_reconciliation,
        "horizon": check_horizon,
    }


async def run_readiness(checks: dict[str, Check]) -> tuple[bool, dict[str, dict]]:
    names = list(checks)
    outcomes = await asyncio.gather(*(checks[name]() for name in names), return_exceptions=True)
    report: dict[str, dict] = {}
    for name, outcome in zip(names, outcomes):
        report[name] = result("fail", f"check raised {type(outcome).__name__}") if isinstance(outcome, Exception) else outcome
    ready = all(entry["status"] != "fail" for entry in report.values() if entry["critical"])
    return ready, report


@router.get("/health", summary="Liveness (alias of /health/live)")
@router.get("/health/live", summary="Liveness probe")
async def live():
    return {"status": "ok", "service": "mixmatch-api-py"}


@router.get("/health/ready", summary="Readiness probe")
async def ready():
    is_ready, report = await run_readiness(default_checks())
    body = {"status": "ready" if is_ready else "not_ready", "service": "mixmatch-api-py", "checks": report}
    return JSONResponse(body, status_code=200 if is_ready else 503)
