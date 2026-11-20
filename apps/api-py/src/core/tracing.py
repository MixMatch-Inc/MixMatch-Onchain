"""OpenTelemetry tracing (#1457).

Enabled by setting ``OTEL_EXPORTER_OTLP_ENDPOINT`` (OTLP over HTTP, e.g. a collector at
``http://otel-collector:4318``). Instruments:

- FastAPI: one server span per request (health and metrics probes are excluded),
- httpx: client spans for Horizon, anchors and other service calls,
- requests: client spans for Vault (``hvac`` uses ``requests``),
- SQLAlchemy: a span per statement.

Spans carry the request id as ``request_id`` (see ``request_id.py``) so traces and logs correlate.
"""

import logging
from typing import Any, Optional

from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, SimpleSpanProcessor, SpanExporter

logger = logging.getLogger("tracing")

EXCLUDED_URLS = "health,metrics"


def build_provider(service_name: str, environment: str, exporter: SpanExporter, simple: bool = False) -> TracerProvider:
    provider = TracerProvider(
        resource=Resource.create({"service.name": service_name, "deployment.environment": environment})
    )
    processor = SimpleSpanProcessor(exporter) if simple else BatchSpanProcessor(exporter)
    provider.add_span_processor(processor)
    return provider


def setup_tracing(
    app: Any,
    engine: Any = None,
    *,
    endpoint: Optional[str] = None,
    service_name: str = "mixmatch-api",
    environment: str = "development",
    exporter: Optional[SpanExporter] = None,
) -> Optional[TracerProvider]:
    """Instrument ``app`` and return the provider, or ``None`` when tracing is not configured.

    ``exporter`` is a seam for tests (an in-memory exporter); production passes ``endpoint``.
    """
    if exporter is None:
        if not endpoint:
            return None
        exporter = OTLPSpanExporter(endpoint=f"{endpoint.rstrip('/')}/v1/traces")

    provider = build_provider(service_name, environment, exporter, simple=not endpoint)
    try:
        trace.set_tracer_provider(provider)
    except Exception:  # the global provider can only be set once per process
        logger.debug("global tracer provider already set; using the explicit provider for the app")

    FastAPIInstrumentor.instrument_app(app, tracer_provider=provider, excluded_urls=EXCLUDED_URLS)
    HTTPXClientInstrumentor().instrument(tracer_provider=provider)
    RequestsInstrumentor().instrument(tracer_provider=provider)
    if engine is not None:
        SQLAlchemyInstrumentor().instrument(engine=getattr(engine, "sync_engine", engine), tracer_provider=provider)
    logger.info("tracing enabled for service %s", service_name)
    return provider
