"""Structured JSON logging with redaction of sensitive values (#1453).

``configure_logging`` installs one stdout handler on the root logger. Every record passes through
``RedactionFilter`` before it is formatted, so secrets that reach a log call (in the message, its
arguments, extra fields or an exception) are replaced with ``[REDACTED]``.
"""

import json
import logging
import re
import sys
from datetime import datetime, timezone
from typing import Any

REDACTED = "[REDACTED]"

# A key is sensitive when it contains any of these fragments (case-insensitive).
SENSITIVE_KEY_FRAGMENTS = (
    "memo",
    "xdr",
    "token",
    "authorization",
    "password",
    "secret",
    "api_key",
    "apikey",
    "private_key",
    "encryption_key",
    "cookie",
    "jwt",
    "seed",
)

# Values that look like credentials wherever they appear in free text.
_VALUE_PATTERNS = (
    re.compile(r"(?i)\bbearer\s+[A-Za-z0-9._~+/=-]+"),
    re.compile(r"\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b"),  # JWT
    re.compile(r"\bS[A-Z2-7]{55}\b"),  # Stellar secret seed
)
_KEY_VALUE = re.compile(
    r"(?i)\b([A-Za-z_]*(?:" + "|".join(SENSITIVE_KEY_FRAGMENTS) + r")[A-Za-z_]*)(\s*[=:]\s*)(\"[^\"]*\"|'[^']*'|\S+)"
)

# Attributes every LogRecord has; anything else was passed with ``extra=`` and is logged as a field.
_STANDARD_ATTRS = frozenset(
    logging.LogRecord("n", logging.INFO, "p", 0, "m", None, None).__dict__.keys()
) | {"message", "asctime", "taskName"}


def is_sensitive_key(key: object) -> bool:
    lowered = str(key).lower()
    return any(fragment in lowered for fragment in SENSITIVE_KEY_FRAGMENTS)


def redact_text(text: str) -> str:
    for pattern in _VALUE_PATTERNS:
        text = pattern.sub(REDACTED, text)
    return _KEY_VALUE.sub(lambda m: f"{m.group(1)}{m.group(2)}{REDACTED}", text)


def redact(value: Any, key: object = None) -> Any:
    """Recursively redact a value; ``key`` is the name it was logged under, if any."""
    if key is not None and is_sensitive_key(key):
        return REDACTED
    if isinstance(value, dict):
        return {k: redact(v, k) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [redact(v) for v in value]
    if isinstance(value, str):
        return redact_text(value)
    return value


class RedactionFilter(logging.Filter):
    """Scrubs the message, its arguments and any ``extra`` fields in place."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.msg = redact_text(record.getMessage())
        record.args = ()
        for name, value in list(record.__dict__.items()):
            if name not in _STANDARD_ATTRS:
                record.__dict__[name] = redact(value, name)
        return True


class JsonFormatter(logging.Formatter):
    """One JSON object per line: timestamp, level, logger, message, extras and any exception."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(timespec="milliseconds"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        for name, value in record.__dict__.items():
            if name not in _STANDARD_ATTRS:
                payload[name] = value
        if record.exc_info:
            payload["exception"] = redact_text(self.formatException(record.exc_info))
        return json.dumps(payload, default=str)


def build_handler(stream=None, json_logs: bool = True) -> logging.Handler:
    handler = logging.StreamHandler(stream or sys.stdout)
    handler.setFormatter(
        JsonFormatter()
        if json_logs
        else logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s")
    )
    handler.addFilter(RedactionFilter())
    return handler


def configure_logging(level: str = "INFO", json_logs: bool = True) -> None:
    """Replace the root handlers with a redacting one and route uvicorn's loggers through it."""
    root = logging.getLogger()
    for existing in list(root.handlers):
        root.removeHandler(existing)
    root.addHandler(build_handler(json_logs=json_logs))
    root.setLevel(level.upper())

    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        uvicorn_logger = logging.getLogger(name)
        uvicorn_logger.handlers.clear()
        uvicorn_logger.propagate = True
