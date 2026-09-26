import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, List, Any
from pydantic import BaseModel, Field, ConfigDict

class SendPaymentRequest(BaseModel):
    destination_public_key: str = Field(..., min_length=56, max_length=56)
    amount: str = Field(..., description="Payment amount as string")
    idempotency_key: Optional[str] = Field(None, max_length=255)
    memo: Optional[str] = Field(None, max_length=28)
    asset_code: Optional[str] = Field(None, max_length=12)
    asset_issuer: Optional[str] = Field(None, max_length=56)

class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    idempotency_key: str
    stellar_account_id: str
    destination_public_key: str
    amount: str
    memo: Optional[str] = None
    asset_code: Optional[str] = None
    asset_issuer: Optional[str] = None
    status: str
    stellar_tx_hash: Optional[str] = None
    failure_code: Optional[str] = None
    failure_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class PaginatedTransactionsResponse(BaseModel):
    transactions: List[TransactionResponse]
    total: int
    page: int
    limit: int

class SSETransactionEvent(BaseModel):
    """Port #1107: Formally versioned Server-Sent Events transaction wire format.
    
    This canonical schema defines the contract consumed by mobile and web clients.
    """
    version: str = Field(default="1.0", description="Schema version of the SSE event")
    event_type: str = Field(..., description="Type of event, e.g. 'transaction_update', 'heartbeat'")
    transaction: Optional[TransactionResponse] = Field(None, description="Updated transaction details")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
