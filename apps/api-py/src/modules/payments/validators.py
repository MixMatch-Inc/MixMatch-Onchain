import re
from decimal import Decimal
from typing import Optional, Literal, Dict, Any
from pydantic import BaseModel, Field, field_validator, model_validator
from fastapi import HTTPException

MAX_HISTORY_LIMIT = 100
DEFAULT_HISTORY_LIMIT = 20

STELLAR_PUBLIC_KEY_REGEX = re.compile(r"^G[A-Z2-7]{55}$")
ASSET_CODE_REGEX = re.compile(r"^[A-Za-z0-9]{1,12}$")
AMOUNT_REGEX = re.compile(r"^\d+(\.\d{1,7})?$")

def parse_history_query(query: Dict[str, Any]) -> tuple[int, int]:
    """Port #1126: parseHistoryQuery logic matching TypeScript."""
    raw_page = query.get("page", 1)
    raw_limit = query.get("limit", DEFAULT_HISTORY_LIMIT)

    try:
        page = int(raw_page)
        limit = int(raw_limit)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="page and limit must be positive integers")

    if page < 1 or limit < 1:
        raise HTTPException(status_code=400, detail="page and limit must be positive integers")

    return page, min(limit, MAX_HISTORY_LIMIT)


class HistoryQueryValidator(BaseModel):
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=DEFAULT_HISTORY_LIMIT, ge=1, le=MAX_HISTORY_LIMIT)


class SendPaymentValidator(BaseModel):
    destination_public_key: str = Field(...)
    amount: str = Field(...)
    memo: Optional[str] = Field(None, max_length=28)
    idempotency_key: Optional[str] = Field(None, min_length=1)
    asset_code: Optional[str] = None
    asset_issuer: Optional[str] = None
    receive_asset_code: Optional[str] = None
    receive_asset_issuer: Optional[str] = None
    path_mode: Optional[Literal["strictSend", "strictReceive"]] = "strictSend"
    slippage_bps: Optional[int] = Field(50, ge=0, le=1000)

    @field_validator("destination_public_key", "asset_issuer", "receive_asset_issuer")
    @classmethod
    def validate_stellar_key(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not STELLAR_PUBLIC_KEY_REGEX.match(v):
                raise ValueError("Enter a valid Stellar address (56 characters, starts with G)")
        return v

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: str) -> str:
        v = v.strip()
        if not AMOUNT_REGEX.match(v):
            raise ValueError("Amount must be a positive number with up to 7 decimal places")
        if Decimal(v) <= 0:
            raise ValueError("Amount must be greater than zero")
        return v

    @field_validator("asset_code", "receive_asset_code")
    @classmethod
    def validate_asset_code(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not ASSET_CODE_REGEX.match(v):
                raise ValueError("Asset code must be 1-12 alphanumeric characters")
        return v

    @model_validator(mode="after")
    def validate_asset_pairs(self) -> "SendPaymentValidator":
        if bool(self.asset_code) != bool(self.asset_issuer):
            raise ValueError("assetCode and assetIssuer must be provided together, or both omitted for native XLM")
        if bool(self.receive_asset_code) != bool(self.receive_asset_issuer):
            raise ValueError("receiveAssetCode and receiveAssetIssuer must be provided together, or both omitted")
        return self


class EstablishTrustlineValidator(BaseModel):
    asset_code: str
    asset_issuer: str
    limit: Optional[str] = None

    @field_validator("asset_code")
    @classmethod
    def validate_code(cls, v: str) -> str:
        if not ASSET_CODE_REGEX.match(v):
            raise ValueError("Asset code must be 1-12 alphanumeric characters")
        return v

    @field_validator("asset_issuer")
    @classmethod
    def validate_issuer(cls, v: str) -> str:
        if not STELLAR_PUBLIC_KEY_REGEX.match(v):
            raise ValueError("Enter a valid Stellar address")
        return v
