"""Sentry error tracking for the API (#1458).

Off unless ``SENTRY_DSN`` is set. ``send_default_pii`` stays false and ``scrub_event`` removes
credentials, transaction memos and envelopes before an event leaves the process.
"""

import logging
import sys
from typing import Any, Optional

REDACTED = "[Filtered]"
SENSITIVE_FRAGMENTS = (
    "authorization",
    "cookie",
    "password",
    "secret",
    "token",
    "memo",
    "xdr",
    "api_key",
    "apikey",
    "private_key",
    "encryption_key",
    "seed",
    "jwt",
)

logger = logging.getLogger("sentry")


def _sensitive(key: object) -> bool:
    lowered = str(key).lower()
    return any(fragment in lowered for fragment in SENSITIVE_FRAGMENTS)


def scrub(value: Any, key: object = None) -> Any:
    if key is not None and _sensitive(key):
        return REDACTED
    if isinstance(value, dict):
        return {k: scrub(v, k) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [scrub(item) for item in value]
    return value


def scrub_event(event: dict, hint: Optional[dict] = None) -> dict:
    """``before_send`` hook: scrub request data, extra context, user, breadcrumbs and frame variables."""
    for section in ("request", "extra", "contexts", "user", "tags"):
        if section in event:
            event[section] = scrub(event[section])
    for breadcrumb in event.get("breadcrumbs", {}).get("values", []) if isinstance(event.get("breadcrumbs"), dict) else []:
        if "data" in breadcrumb:
            breadcrumb["data"] = scrub(breadcrumb["data"])
    for exception in event.get("exception", {}).get("values", []) if isinstance(event.get("exception"), dict) else []:
        for frame in (exception.get("stacktrace") or {}).get("frames", []):
            if "vars" in frame:
                frame["vars"] = scrub(frame["vars"])
    return event


def init_sentry(
    dsn: Optional[str],
    environment: str = "development",
    release: Optional[str] = None,
    traces_sample_rate: float = 0.0,
) -> bool:
    """Initialise the SDK. Returns False (and does nothing) when no DSN is configured."""
    if not dsn:
        return False

    import sentry_sdk

    sentry_sdk.init(
        dsn=dsn,
        environment=environment,
        release=release,
        traces_sample_rate=traces_sample_rate,
        send_default_pii=False,
        before_send=scrub_event,
    )
    logger.info("Sentry enabled for environment %s (release %s)", environment, release or "unset")
    return True


def send_test_event() -> None:
    """``python -m src.core.sentry``: send one test error so you can see it arrive in the project."""
    from src.core.config import settings

    if not init_sentry(settings.SENTRY_DSN, settings.ENVIRONMENT, settings.SENTRY_RELEASE, settings.SENTRY_TRACES_SAMPLE_RATE):
        sys.exit("SENTRY_DSN is not set")

    import sentry_sdk

    try:
        raise RuntimeError("MixMatch API Sentry test event (safe to ignore)")
    except RuntimeError:
        sentry_sdk.capture_exception()
    sentry_sdk.flush(timeout=5)
    print("test event sent", file=sys.stderr)


if __name__ == "__main__":
    send_test_event()
