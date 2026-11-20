"""Request-ID propagation and access logging (#1454).

``RequestIdMiddleware`` reads (or creates) an ``X-Request-ID``, stores it in a context variable for
the duration of the request, echoes it on the response, logs one access line per request and turns
unhandled exceptions into a 500 JSON body that carries the same id. ``install_log_record_factory``
stamps every log record with the current id, and ``outbound_headers`` forwards it to Horizon and
anchor calls, so one id traces a request across all of them.
"""

import json
import logging
import re
import time
import uuid
from contextvars import ContextVar
from typing import Optional

from opentelemetry import trace

REQUEST_ID_HEADER = "X-Request-ID"
_VALID_ID = re.compile(r"^[A-Za-z0-9._-]{8,128}$")

request_id_var: ContextVar[Optional[str]] = ContextVar("request_id", default=None)

access_logger = logging.getLogger("access")
error_logger = logging.getLogger("request.error")


def get_request_id() -> Optional[str]:
    return request_id_var.get()


def new_request_id() -> str:
    return uuid.uuid4().hex


def resolve_request_id(header_value: Optional[str]) -> str:
    """Accept a client-supplied id only if it is a safe token; otherwise generate one."""
    if header_value and _VALID_ID.fullmatch(header_value):
        return header_value
    return new_request_id()


def outbound_headers(extra: Optional[dict] = None) -> dict:
    """Headers for calls to Horizon, anchors and other services so they can be correlated."""
    headers = dict(extra or {})
    current = get_request_id()
    if current:
        headers[REQUEST_ID_HEADER] = current
    return headers


def install_log_record_factory() -> None:
    """Add ``request_id`` to every log record created from now on. Safe to call more than once."""
    previous = logging.getLogRecordFactory()
    if getattr(previous, "_adds_request_id", False):
        return

    def factory(*args, **kwargs):
        record = previous(*args, **kwargs)
        if not hasattr(record, "request_id"):
            record.request_id = get_request_id()
        return record

    factory._adds_request_id = True  # type: ignore[attr-defined]
    logging.setLogRecordFactory(factory)


class RequestIdMiddleware:
    """Pure ASGI middleware (no BaseHTTPMiddleware, so streaming/SSE responses are untouched)."""

    def __init__(self, app, header_name: str = REQUEST_ID_HEADER):
        self.app = app
        self.header_name = header_name
        self._header_key = header_name.lower().encode("latin-1")

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        incoming = None
        for key, value in scope.get("headers", []):
            if key == self._header_key:
                incoming = value.decode("latin-1")
                break
        request_id = resolve_request_id(incoming)
        token = request_id_var.set(request_id)
        # No-op unless tracing is enabled: lets a trace be found from a request id in the logs.
        trace.get_current_span().set_attribute("request_id", request_id)

        started = time.perf_counter()
        status_holder = {"status": 500, "started": False}

        async def send_with_id(message):
            if message["type"] == "http.response.start":
                status_holder["status"] = message["status"]
                status_holder["started"] = True
                headers = [(k, v) for k, v in message.get("headers", []) if k.lower() != self._header_key]
                headers.append((self._header_key, request_id.encode("latin-1")))
                message = {**message, "headers": headers}
            await send(message)

        try:
            await self.app(scope, receive, send_with_id)
        except Exception:
            error_logger.exception("unhandled error")
            if not status_holder["started"]:
                body = json.dumps(
                    {"code": "INTERNAL_ERROR", "message": "Internal server error", "details": {}, "request_id": request_id}
                ).encode()
                await send_with_id(
                    {
                        "type": "http.response.start",
                        "status": 500,
                        "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode())],
                    }
                )
                await send({"type": "http.response.body", "body": body})
        finally:
            duration_ms = round((time.perf_counter() - started) * 1000, 2)
            access_logger.info(
                "%s %s -> %s",
                scope.get("method", "-"),
                scope.get("path", "-"),
                status_holder["status"],
                extra={
                    "method": scope.get("method"),
                    "path": scope.get("path"),
                    "status": status_holder["status"],
                    "duration_ms": duration_ms,
                },
            )
            request_id_var.reset(token)
