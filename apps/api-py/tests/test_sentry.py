"""Sentry is optional and never sends credentials or transaction details (#1458)."""

import sys
import types

from src.core import sentry
from src.core.sentry import REDACTED, init_sentry, scrub_event


def test_init_is_a_noop_without_a_dsn():
    assert init_sentry(None) is False
    assert init_sentry("") is False


def test_init_passes_release_environment_and_safe_defaults(monkeypatch):
    captured = {}
    fake = types.SimpleNamespace(init=lambda **kwargs: captured.update(kwargs))
    monkeypatch.setitem(sys.modules, "sentry_sdk", fake)

    assert init_sentry("https://key@example.ingest.sentry.io/1", "production", "abc123", 0.1) is True

    assert captured["environment"] == "production"
    assert captured["release"] == "abc123"
    assert captured["traces_sample_rate"] == 0.1
    assert captured["send_default_pii"] is False
    assert captured["before_send"] is sentry.scrub_event


def test_scrub_removes_credentials_memos_and_envelopes_everywhere():
    event = {
        "request": {
            "headers": {"Authorization": "Bearer abc", "Cookie": "sid=1", "Accept": "application/json"},
            "data": {"memo": "hello", "amount": "10", "password": "hunter2"},
        },
        "extra": {"pending_envelope_xdr": "AAAA", "attempt": 2},
        "user": {"id": "u1", "access_token": "tok"},
        "breadcrumbs": {"values": [{"data": {"refresh_token": "r", "url": "/x"}}]},
        "exception": {"values": [{"stacktrace": {"frames": [{"vars": {"wallet_encryption_key": "k", "n": 3}}]}}]},
    }

    scrubbed = scrub_event(event)

    request = scrubbed["request"]
    assert request["headers"]["Authorization"] == REDACTED
    assert request["headers"]["Cookie"] == REDACTED
    assert request["headers"]["Accept"] == "application/json"
    assert request["data"] == {"memo": REDACTED, "amount": "10", "password": REDACTED}
    assert scrubbed["extra"] == {"pending_envelope_xdr": REDACTED, "attempt": 2}
    assert scrubbed["user"] == {"id": "u1", "access_token": REDACTED}
    assert scrubbed["breadcrumbs"]["values"][0]["data"] == {"refresh_token": REDACTED, "url": "/x"}
    frame_vars = scrubbed["exception"]["values"][0]["stacktrace"]["frames"][0]["vars"]
    assert frame_vars == {"wallet_encryption_key": REDACTED, "n": 3}


def test_scrub_tolerates_sparse_events():
    assert scrub_event({}) == {}
    assert scrub_event({"breadcrumbs": [], "exception": []}) == {"breadcrumbs": [], "exception": []}
