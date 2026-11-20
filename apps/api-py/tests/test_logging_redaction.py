"""Sensitive fields must never reach log output (#1453)."""

import io
import json
import logging

import pytest

from src.core.structured_logging import REDACTED, JsonFormatter, RedactionFilter, build_handler, redact

SECRET_SEED = "S" + "A" * 55
JWT = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.c2lnbmF0dXJl"


@pytest.fixture
def capture():
    stream = io.StringIO()
    logger = logging.getLogger("test.redaction")
    logger.handlers = [build_handler(stream)]
    logger.setLevel(logging.DEBUG)
    logger.propagate = False

    def lines() -> list[dict]:
        return [json.loads(line) for line in stream.getvalue().splitlines() if line]

    yield logger, lines, stream
    logger.handlers = []


def test_output_is_one_json_object_per_line_with_standard_fields(capture):
    logger, lines, _ = capture
    logger.info("payment submitted", extra={"tx_id": "abc"})

    (entry,) = lines()
    assert entry["level"] == "INFO"
    assert entry["logger"] == "test.redaction"
    assert entry["message"] == "payment submitted"
    assert entry["tx_id"] == "abc"
    assert entry["timestamp"].endswith("+00:00")


def test_levels_are_respected(capture):
    logger, lines, _ = capture
    logger.setLevel(logging.WARNING)
    logger.info("hidden")
    logger.warning("shown")
    assert [entry["message"] for entry in lines()] == ["shown"]


@pytest.mark.parametrize("field", ["memo", "pending_envelope_xdr", "access_token", "refresh_token", "password", "authorization"])
def test_sensitive_extra_fields_are_redacted(capture, field):
    logger, lines, stream = capture
    logger.info("event", extra={field: "super-sensitive-value"})

    assert lines()[0][field] == REDACTED
    assert "super-sensitive-value" not in stream.getvalue()


def test_nested_structures_are_redacted(capture):
    logger, lines, stream = capture
    logger.info("event", extra={"request": {"headers": {"Authorization": "Bearer abc"}, "memo": "hello", "ok": 1}})

    request = lines()[0]["request"]
    assert request["headers"]["Authorization"] == REDACTED
    assert request["memo"] == REDACTED
    assert request["ok"] == 1


def test_credentials_in_messages_and_arguments_are_redacted(capture):
    logger, lines, stream = capture
    logger.info("sending with %s", f"Bearer {JWT}")
    logger.info("signing with %s", SECRET_SEED)
    logger.info("jwt was %s", JWT)
    logger.error("payload memo=top-secret-memo token: abc123 other=fine")

    output = stream.getvalue()
    for leaked in (JWT, SECRET_SEED, "top-secret-memo", "abc123"):
        assert leaked not in output
    assert "other=fine" in output


def test_exceptions_are_logged_without_secrets(capture):
    logger, lines, stream = capture
    try:
        raise RuntimeError(f"failed to sign with {SECRET_SEED}")
    except RuntimeError:
        logger.exception("signing failed")

    entry = lines()[0]
    assert "RuntimeError" in entry["exception"]
    assert SECRET_SEED not in stream.getvalue()


def test_redact_helper_leaves_harmless_values_alone():
    assert redact({"count": 3, "name": "ok", "items": ["a", "b"]}) == {"count": 3, "name": "ok", "items": ["a", "b"]}


def test_filter_and_formatter_can_be_used_independently():
    record = logging.LogRecord("x", logging.INFO, "f", 1, "token=%s", ("abc",), None)
    assert RedactionFilter().filter(record)
    assert REDACTED in JsonFormatter().format(record)
