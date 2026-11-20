"""Liveness never depends on dependencies; readiness reflects them (#1459)."""

from datetime import datetime, timedelta, timezone

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine

from src.core import health
from src.core.metrics import reconciliation_metrics


@pytest.fixture(autouse=True)
def fresh_metrics():
    reconciliation_metrics.reset()
    yield
    reconciliation_metrics.reset()


@pytest.fixture
def client():
    app = FastAPI()
    app.include_router(health.router)
    return TestClient(app)


def ok(critical=True):
    async def check():
        return health.result("ok", critical=critical)

    return check


def failing(critical=True):
    async def check():
        return health.result("fail", "down", critical=critical)

    return check


def raising():
    async def check():
        raise RuntimeError("boom")

    return check


def test_liveness_and_legacy_health_always_report_ok(client, monkeypatch):
    monkeypatch.setattr(health, "default_checks", lambda: {"database": failing()})
    for path in ("/health", "/health/live"):
        response = client.get(path)
        assert response.status_code == 200
        assert response.json() == {"status": "ok", "service": "mixmatch-api-py"}


def test_readiness_is_200_when_every_critical_check_passes(client, monkeypatch):
    monkeypatch.setattr(health, "default_checks", lambda: {"database": ok(), "vault": ok()})
    response = client.get("/health/ready")
    assert response.status_code == 200
    assert response.json()["status"] == "ready"


def test_readiness_fails_when_a_critical_check_fails(client, monkeypatch):
    monkeypatch.setattr(health, "default_checks", lambda: {"database": failing(), "vault": ok()})
    response = client.get("/health/ready")
    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "not_ready"
    assert body["checks"]["database"]["status"] == "fail"


def test_a_failing_non_critical_check_does_not_fail_readiness(client, monkeypatch):
    monkeypatch.setattr(health, "default_checks", lambda: {"database": ok(), "horizon": failing(critical=False)})
    assert client.get("/health/ready").status_code == 200


def test_a_check_that_raises_counts_as_failed(client, monkeypatch):
    monkeypatch.setattr(health, "default_checks", lambda: {"database": raising()})
    response = client.get("/health/ready")
    assert response.status_code == 503
    assert "RuntimeError" in response.json()["checks"]["database"]["detail"]


async def test_database_check_passes_with_a_working_engine():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    try:
        assert (await health.check_database(engine))["status"] == "ok"
    finally:
        await engine.dispose()


async def test_database_check_fails_when_the_database_is_down():
    class DownEngine:
        def connect(self):
            raise ConnectionError("db is down")

    outcome = await health.check_database(DownEngine())
    assert outcome["status"] == "fail" and outcome["critical"]
    assert "db is down" not in outcome["detail"]  # no connection details leak into the response


async def test_vault_check_is_skipped_when_unconfigured():
    assert (await health.check_vault(""))["status"] == "skipped"


async def test_vault_check_fails_when_unreachable():
    outcome = await health.check_vault("http://127.0.0.1:1")
    assert outcome["status"] == "fail"


async def test_horizon_outage_is_degraded_not_critical():
    outcome = await health.check_horizon("http://127.0.0.1:1")
    assert outcome["status"] == "degraded" and not outcome["critical"]


async def test_reconciliation_check_is_skipped_when_the_job_is_disabled():
    assert (await health.check_reconciliation(enabled=False))["status"] == "skipped"


async def test_reconciliation_check_fails_when_the_loop_never_ticked_or_stalled():
    assert (await health.check_reconciliation(enabled=True, poll_interval=30))["status"] == "fail"

    reconciliation_metrics.record_tick(datetime.now(timezone.utc))
    assert (await health.check_reconciliation(enabled=True, poll_interval=30))["status"] == "ok"

    reconciliation_metrics.record_tick(datetime.now(timezone.utc) - timedelta(minutes=10))
    assert (await health.check_reconciliation(enabled=True, poll_interval=30))["status"] == "fail"


def test_taste_health_reports_the_services_own_stub_flag():
    from src.modules.taste.service import TasteService

    assert TasteService.is_stub is True
