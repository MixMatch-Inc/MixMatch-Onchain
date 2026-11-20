"""One request id must trace a request across responses, errors, logs and outbound calls (#1454)."""

import logging

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.core.request_id import (
    REQUEST_ID_HEADER,
    RequestIdMiddleware,
    get_request_id,
    install_log_record_factory,
    outbound_headers,
    resolve_request_id,
)

install_log_record_factory()


def build_app() -> FastAPI:
    app = FastAPI()
    app.add_middleware(RequestIdMiddleware)

    @app.get("/ping")
    async def ping():
        logging.getLogger("test.handler").info("inside handler")
        return {"request_id": get_request_id(), "outbound": outbound_headers({"X-Other": "1"})}

    @app.get("/boom")
    async def boom():
        raise RuntimeError("kaboom: internal detail")

    return app


@pytest.fixture
def client():
    return TestClient(build_app(), raise_server_exceptions=False)


def test_generates_an_id_and_returns_it(client):
    response = client.get("/ping")
    assert response.status_code == 200
    rid = response.headers[REQUEST_ID_HEADER]
    assert len(rid) == 32
    assert response.json()["request_id"] == rid


def test_accepts_a_safe_client_supplied_id(client):
    response = client.get("/ping", headers={REQUEST_ID_HEADER: "client-trace-1234"})
    assert response.headers[REQUEST_ID_HEADER] == "client-trace-1234"
    assert response.json()["request_id"] == "client-trace-1234"


@pytest.mark.parametrize("bad", ["short", "has spaces in it!!", "x" * 200, "new\nline-injection"])
def test_replaces_unsafe_client_ids(bad):
    generated = resolve_request_id(bad)
    assert generated != bad and len(generated) == 32


def test_outbound_calls_carry_the_same_id(client):
    response = client.get("/ping", headers={REQUEST_ID_HEADER: "client-trace-1234"})
    assert response.json()["outbound"] == {"X-Other": "1", REQUEST_ID_HEADER: "client-trace-1234"}


def test_outbound_headers_without_a_request_are_unchanged():
    assert outbound_headers({"A": "b"}) == {"A": "b"}
    assert get_request_id() is None


def test_unhandled_errors_return_a_500_body_with_the_id_and_no_internals(client):
    response = client.get("/boom", headers={REQUEST_ID_HEADER: "client-trace-1234"})
    assert response.status_code == 500
    body = response.json()
    assert body["request_id"] == "client-trace-1234"
    assert body["code"] == "INTERNAL_ERROR"
    assert "kaboom" not in response.text
    assert response.headers[REQUEST_ID_HEADER] == "client-trace-1234"


def test_log_lines_share_the_request_id(client, caplog):
    with caplog.at_level(logging.INFO):
        response = client.get("/ping", headers={REQUEST_ID_HEADER: "client-trace-1234"})
    rid = response.headers[REQUEST_ID_HEADER]

    handler_lines = [r for r in caplog.records if r.name == "test.handler"]
    access_lines = [r for r in caplog.records if r.name == "access"]
    assert handler_lines and access_lines
    assert {r.request_id for r in handler_lines + access_lines} == {rid}


def test_access_log_records_method_path_status_and_duration(client, caplog):
    with caplog.at_level(logging.INFO, logger="access"):
        client.get("/ping")
    record = next(r for r in caplog.records if r.name == "access")
    assert (record.method, record.path, record.status) == ("GET", "/ping", 200)
    assert record.duration_ms >= 0
