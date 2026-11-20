"""Production startup must refuse sample secrets, short keys and placeholders (#1447)."""

import secrets

import pytest
from pydantic import ValidationError

from src.core.config import DEFAULT_JWT_SECRET, DEFAULT_WALLET_ENCRYPTION_KEY, Settings


def build(**overrides) -> Settings:
    # Settings reads aliases (NODE_ENV, JWT_SECRET, ...); _env_file=None keeps a local .env out of the test.
    return Settings(_env_file=None, **overrides)


def strong_jwt() -> str:
    return secrets.token_urlsafe(48)


def strong_key() -> str:
    return secrets.token_hex(32)


def message_of(excinfo: pytest.ExceptionInfo) -> str:
    return str(excinfo.value)


def test_production_accepts_strong_secrets():
    settings = build(NODE_ENV="production", JWT_SECRET=strong_jwt(), WALLET_ENCRYPTION_KEY=strong_key())
    assert settings.ENVIRONMENT == "production"


def test_development_keeps_the_convenient_defaults():
    settings = build(NODE_ENV="development")
    assert settings.JWT_SECRET == DEFAULT_JWT_SECRET
    assert settings.WALLET_ENCRYPTION_KEY == DEFAULT_WALLET_ENCRYPTION_KEY


def test_production_refuses_the_default_secrets():
    with pytest.raises(ValidationError) as excinfo:
        build(NODE_ENV="production")
    text = message_of(excinfo)
    assert "JWT_SECRET" in text and "WALLET_ENCRYPTION_KEY" in text


@pytest.mark.parametrize(
    "jwt_secret",
    ["short", "x" * 31, "change-me-before-production-use-abcdef", "<generate with: openssl rand -base64 48>", "my-example-secret-" + "a" * 20],
)
def test_production_refuses_weak_or_placeholder_jwt_secrets(jwt_secret):
    with pytest.raises(ValidationError) as excinfo:
        build(NODE_ENV="production", JWT_SECRET=jwt_secret, WALLET_ENCRYPTION_KEY=strong_key())
    assert "JWT_SECRET" in message_of(excinfo)


@pytest.mark.parametrize(
    "wallet_key",
    ["", "abc", "z" * 64, "0" * 64, "ab" * 32, DEFAULT_WALLET_ENCRYPTION_KEY, "A" * 64],
)
def test_production_refuses_bad_wallet_keys(wallet_key):
    with pytest.raises(ValidationError) as excinfo:
        build(NODE_ENV="production", JWT_SECRET=strong_jwt(), WALLET_ENCRYPTION_KEY=wallet_key)
    assert "WALLET_ENCRYPTION_KEY" in message_of(excinfo)


def test_errors_never_echo_the_secret_values():
    bad_jwt = "change-me-before-production-use-abcdef"
    with pytest.raises(ValidationError) as excinfo:
        build(NODE_ENV="production", JWT_SECRET=bad_jwt, WALLET_ENCRYPTION_KEY=DEFAULT_WALLET_ENCRYPTION_KEY)
    text = message_of(excinfo)
    assert bad_jwt not in text
    assert DEFAULT_WALLET_ENCRYPTION_KEY not in text


def test_all_problems_are_reported_together():
    with pytest.raises(ValidationError) as excinfo:
        build(NODE_ENV="production", JWT_SECRET="short", WALLET_ENCRYPTION_KEY="abc")
    text = message_of(excinfo)
    assert "JWT_SECRET" in text and "WALLET_ENCRYPTION_KEY" in text
