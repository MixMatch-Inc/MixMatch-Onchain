"""Tracing is optional and, when enabled, produces server spans tagged with the request id (#1457)."""

from fastapi import FastAPI
from fastapi.testclient import TestClient
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter

from src.core.request_id import REQUEST_ID_HEADER, RequestIdMiddleware
from src.core.tracing import setup_tracing


def build_app() -> FastAPI:
    app = FastAPI()
    app.add_middleware(RequestIdMiddleware)

    @app.get("/work")
    async def work():
        return {"ok": True}

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    return app


def test_tracing_is_off_without_an_endpoint():
    assert setup_tracing(build_app()) is None
    assert setup_tracing(build_app(), endpoint="") is None


def test_a_request_produces_a_server_span_with_the_request_id():
    exporter = InMemorySpanExporter()
    app = build_app()
    provider = setup_tracing(app, exporter=exporter, service_name="mixmatch-test")
    assert provider is not None

    TestClient(app).get("/work", headers={REQUEST_ID_HEADER: "client-trace-1234"})
    provider.force_flush()

    spans = [span for span in exporter.get_finished_spans() if span.attributes.get("http.route") == "/work"]
    assert spans, "expected a server span for /work"
    assert spans[0].resource.attributes["service.name"] == "mixmatch-test"
    assert spans[0].attributes["request_id"] == "client-trace-1234"


def test_health_probes_are_not_traced():
    exporter = InMemorySpanExporter()
    app = build_app()
    provider = setup_tracing(app, exporter=exporter)

    TestClient(app).get("/health")
    provider.force_flush()

    assert not [span for span in exporter.get_finished_spans() if span.attributes.get("http.route") == "/health"]
