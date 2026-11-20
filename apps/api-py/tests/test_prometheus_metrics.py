"""``/metrics`` exposes HTTP, SSE, pool and job metrics that work across workers (#1455)."""

import asyncio

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.core import prometheus as prom


def build_app() -> FastAPI:
    app = FastAPI()
    app.add_middleware(prom.PrometheusMiddleware)

    @app.get("/items/{item_id}")
    async def item(item_id: str):
        return {"id": item_id}

    @app.get("/fail")
    async def fail():
        raise RuntimeError("boom")

    @app.get("/metrics")
    async def metrics():
        from fastapi import Response

        body, content_type = prom.render_metrics()
        return Response(content=body, media_type=content_type)

    return app


@pytest.fixture
def client():
    return TestClient(build_app(), raise_server_exceptions=False)


def scrape(client: TestClient) -> str:
    return client.get("/metrics").text


def sample(text: str, prefix: str) -> float:
    for line in text.splitlines():
        if line.startswith(prefix):
            return float(line.rsplit(" ", 1)[1])
    raise AssertionError(f"no sample starting with {prefix!r}")


def test_requests_are_counted_by_route_template_not_raw_path(client):
    client.get("/items/1")
    client.get("/items/2")
    text = scrape(client)

    assert 'route="/items/{item_id}"' in text
    assert 'route="/items/1"' not in text
    assert sample(text, 'http_requests_total{method="GET",route="/items/{item_id}",status="200"}') >= 2


def test_server_errors_are_counted_with_their_status(client):
    client.get("/fail")
    assert 'status="500"' in scrape(client)


def test_latency_histogram_has_slo_boundaries(client):
    client.get("/items/1")
    text = scrape(client)
    for boundary in ("0.045", "0.15", "0.4"):
        assert f'le="{boundary}"' in text


def test_scrapes_are_not_counted_as_traffic(client):
    scrape(client)
    assert 'route="/metrics"' not in scrape(client)


def test_unmatched_routes_share_one_label(client):
    client.get("/does/not/exist/1")
    client.get("/does/not/exist/2")
    text = scrape(client)
    assert 'route="unmatched"' in text
    assert "/does/not/exist" not in text


async def test_sse_gauge_and_session_duration_are_tracked():
    async def events():
        yield 1
        yield 2

    before = sample_total("sse_session_duration_seconds_count")
    seen = [event async for event in prom.track_sse(events())]

    assert seen == [1, 2]
    assert sample_total("sse_connections_active") == 0
    assert sample_total("sse_session_duration_seconds_count") == before + 1


async def test_sse_gauge_is_released_when_the_client_disconnects():
    async def endless():
        while True:
            yield "tick"
            await asyncio.sleep(0)

    stream = prom.track_sse(endless())
    await stream.__anext__()
    assert sample_total("sse_connections_active") == 1
    await stream.aclose()
    assert sample_total("sse_connections_active") == 0


def test_reconciliation_job_metrics_are_exported(client):
    prom.observe_reconciliation(success=True)
    prom.observe_reconciliation(success=False)
    prom.set_reconciliation_health(backlog=3, oldest_pending_age_seconds=42.5, last_run_timestamp=1_700_000_000)
    text = scrape(client)

    assert sample(text, "reconciliation_processed_total") >= 2
    assert sample(text, "reconciliation_failures_total") >= 1
    assert sample(text, "reconciliation_pending_transactions") == 3
    assert sample(text, "reconciliation_oldest_pending_age_seconds") == 42.5
    assert sample(text, "reconciliation_last_run_timestamp_seconds") == 1_700_000_000


def test_db_pool_gauges_read_the_pool():
    class FakePool:
        def checkedout(self):
            return 4

        def size(self):
            return 20

        def overflow(self):
            return 1

    class FakeEngine:
        pool = FakePool()

    prom.update_db_pool_gauges(FakeEngine())
    text = prom.render_metrics()[0].decode()
    assert sample(text, 'db_pool_connections{state="checked_out"}') == 4
    assert sample(text, 'db_pool_connections{state="size"}') == 20


def test_pools_without_counters_are_ignored():
    class NoPool:
        pool = object()

    prom.update_db_pool_gauges(NoPool())


def test_dead_worker_files_are_cleaned_up():
    assert prom.cleanup_dead_process_files() >= 0


def sample_total(name: str) -> float:
    text = prom.render_metrics()[0].decode()
    return sum(float(line.rsplit(" ", 1)[1]) for line in text.splitlines() if line.startswith(name))
