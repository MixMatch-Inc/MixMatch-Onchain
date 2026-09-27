import os
import re
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, model_validator
from typing import Optional

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    API_PREFIX: str = "/api"
    ENVIRONMENT: str = Field(default="development", alias="NODE_ENV")
    PORT: int = Field(default=8000, alias="PORT")
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./test.db",
        alias="DATABASE_URL",
    )
    JWT_SECRET: str = Field(default="dev_insecure_jwt_secret_min_32_characters_long", alias="JWT_SECRET")
    JWT_EXPIRATION_DELTA_SECONDS: int = 86400
    
    STELLAR_NETWORK: str = Field(default="testnet", alias="STELLAR_NETWORK")
    HORIZON_URL: str = Field(default="https://horizon-testnet.stellar.org", alias="HORIZON_URL")
    ANCHOR_HOME_DOMAIN: Optional[str] = Field(default=None, alias="ANCHOR_HOME_DOMAIN")
    
    VAULT_ADDR: Optional[str] = Field(default=None, alias="VAULT_ADDR")
    VAULT_TOKEN: Optional[str] = Field(default=None, alias="VAULT_TOKEN")
    WALLET_ENCRYPTION_KEY: str = Field(
        default="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        alias="WALLET_ENCRYPTION_KEY",
    )
    
    HIGH_VALUE_THRESHOLD_XLM: float = 1000.0
    RECONCILIATION_STALE_MS: int = 300_000  # 5 minutes
    RECONCILIATION_CONCURRENCY_LIMIT: int = 10

    ENABLE_TASTE_CRON: bool = False

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
            if not self.JWT_SECRET or len(self.JWT_SECRET) < 32:
                raise ValueError("JWT_SECRET must be at least 32 characters long in production")
            if not re.fullmatch(r"[0-9a-f]{64}", self.WALLET_ENCRYPTION_KEY or ""):
                raise ValueError("WALLET_ENCRYPTION_KEY must be a 64-character hex string (32 bytes for AES-256)")
        if self.VAULT_ADDR and not self.VAULT_TOKEN:
            raise ValueError("VAULT_TOKEN is required when VAULT_ADDR is set")
        return self

settings = Settings()

def get_settings() -> Settings:
    return settings
