import os
import re
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, model_validator
from typing import Optional

# Development-only defaults. Production must override both; see validate_production_secrets.
DEFAULT_JWT_SECRET = "dev_insecure_jwt_secret_min_32_characters_long"
DEFAULT_WALLET_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

# Substrings that mark a value as copied from a template or example.
PLACEHOLDER_MARKERS = ("change-me", "changeme", "insecure", "placeholder", "example", "<generate", "your-secret")
MIN_JWT_SECRET_LENGTH = 32


def _looks_like_placeholder(value: str) -> bool:
    lowered = value.lower()
    return any(marker in lowered for marker in PLACEHOLDER_MARKERS)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    API_PREFIX: str = "/api"
    ENVIRONMENT: str = Field(default="development", alias="NODE_ENV")
    PORT: int = Field(default=8000, alias="PORT")
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./test.db",
        alias="DATABASE_URL",
    )
    JWT_SECRET: str = Field(default=DEFAULT_JWT_SECRET, alias="JWT_SECRET")
    JWT_EXPIRATION_DELTA_SECONDS: int = 86400
    
    STELLAR_NETWORK: str = Field(default="testnet", alias="STELLAR_NETWORK")
    HORIZON_URL: str = Field(default="https://horizon-testnet.stellar.org", alias="HORIZON_URL")
    ANCHOR_HOME_DOMAIN: Optional[str] = Field(default=None, alias="ANCHOR_HOME_DOMAIN")
    
    VAULT_ADDR: Optional[str] = Field(default=None, alias="VAULT_ADDR")
    VAULT_TOKEN: Optional[str] = Field(default=None, alias="VAULT_TOKEN")
    WALLET_ENCRYPTION_KEY: str = Field(
        default=DEFAULT_WALLET_ENCRYPTION_KEY,
        alias="WALLET_ENCRYPTION_KEY",
    )
    
    HIGH_VALUE_THRESHOLD_XLM: float = 1000.0
    RECONCILIATION_STALE_MS: int = 300_000  # 5 minutes
    RECONCILIATION_CONCURRENCY_LIMIT: int = 10

    ENABLE_TASTE_CRON: bool = False

    # Tracing is off unless an OTLP/HTTP endpoint is configured (for example http://otel-collector:4318).
    OTEL_EXPORTER_OTLP_ENDPOINT: Optional[str] = None
    OTEL_SERVICE_NAME: str = "mixmatch-api"

    @property
    def enable_taste_cron(self) -> bool:
        return self.ENABLE_TASTE_CRON

    @model_validator(mode="after")
    def validate_anchor_home_domain(self) -> "Settings":
        if self.STELLAR_NETWORK == "public" and not self.ANCHOR_HOME_DOMAIN:
            raise ValueError("ANCHOR_HOME_DOMAIN is strictly required when STELLAR_NETWORK is 'public'")
        return self

    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        if self.ENVIRONMENT == "production":
            # Collect every problem so an operator fixes them in one pass. Messages never include the values.
            problems: list[str] = []

            jwt_secret = self.JWT_SECRET or ""
            if len(jwt_secret) < MIN_JWT_SECRET_LENGTH:
                problems.append(f"JWT_SECRET must be at least {MIN_JWT_SECRET_LENGTH} characters long in production")
            if jwt_secret == DEFAULT_JWT_SECRET or _looks_like_placeholder(jwt_secret):
                problems.append("JWT_SECRET is a default or placeholder value; generate one with: openssl rand -base64 48")

            wallet_key = self.WALLET_ENCRYPTION_KEY or ""
            if not re.fullmatch(r"[0-9a-f]{64}", wallet_key):
                problems.append("WALLET_ENCRYPTION_KEY must be a 64-character lowercase hex string (32 bytes for AES-256)")
            elif wallet_key == DEFAULT_WALLET_ENCRYPTION_KEY or len(set(wallet_key)) < 8:
                problems.append("WALLET_ENCRYPTION_KEY is a default or low-entropy value; generate one with: openssl rand -hex 32")

            if problems:
                raise ValueError("insecure production configuration: " + "; ".join(problems))
        if self.VAULT_ADDR and not self.VAULT_TOKEN:
            raise ValueError("VAULT_TOKEN is required when VAULT_ADDR is set")
        return self

settings = Settings()

def get_settings() -> Settings:
    return settings
