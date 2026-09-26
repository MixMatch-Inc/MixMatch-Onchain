import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import (
    String, Text, Boolean, Integer, Float, DateTime, ForeignKey, Index, Enum as SAEnum
)
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.core.database import Base

def utcnow() -> datetime:
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    role: Mapped[str] = mapped_column(String(32), default="USER", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    stellar_account: Mapped[Optional["StellarAccount"]] = relationship("StellarAccount", back_populates="user", uselist=False, cascade="all, delete-orphan")
    streaming_connections: Mapped[List["StreamingConnection"]] = relationship("StreamingConnection", back_populates="user", cascade="all, delete-orphan")


class StellarAccount(Base):
    __tablename__ = "stellar_accounts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    public_key: Mapped[str] = mapped_column(String(56), unique=True, nullable=False, index=True)
    encrypted_secret_key: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    signing_key_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    network: Mapped[str] = mapped_column(String(32), default="testnet", nullable=False)
    multisig_configured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="stellar_account")
    transactions: Mapped[List["Transaction"]] = relationship("Transaction", back_populates="stellar_account", cascade="all, delete-orphan")


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    idempotency_key: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    stellar_account_id: Mapped[str] = mapped_column(String(36), ForeignKey("stellar_accounts.id", ondelete="CASCADE"), nullable=False)
    destination_public_key: Mapped[str] = mapped_column(String(56), nullable=False)
    amount: Mapped[str] = mapped_column(String(64), nullable=False)
    memo: Mapped[Optional[str]] = mapped_column(String(28), nullable=True)
    asset_code: Mapped[Optional[str]] = mapped_column(String(12), nullable=True)
    asset_issuer: Mapped[Optional[str]] = mapped_column(String(56), nullable=True)
    receive_asset_code: Mapped[Optional[str]] = mapped_column(String(12), nullable=True)
    receive_asset_issuer: Mapped[Optional[str]] = mapped_column(String(56), nullable=True)
    dest_amount: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    pending_envelope_xdr: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="PENDING", nullable=False, index=True)
    stellar_tx_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    failure_code: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    failure_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_reconciled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    stellar_account: Mapped["StellarAccount"] = relationship("StellarAccount", back_populates="transactions")

    __table_args__ = (
        Index("ix_transactions_account_created", "stellar_account_id", "created_at"),
    )


class Escrow(Base):
    __tablename__ = "escrows"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    idempotency_key: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    payer_stellar_account_id: Mapped[str] = mapped_column(String(36), ForeignKey("stellar_accounts.id", ondelete="CASCADE"), nullable=False)
    payee_public_key: Mapped[str] = mapped_column(String(56), nullable=False)
    token_contract_id: Mapped[str] = mapped_column(String(56), nullable=False)
    amount: Mapped[str] = mapped_column(String(64), nullable=False)
    on_chain_escrow_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    timeout_ledger: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="PENDING", nullable=False)
    deposit_tx_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    finalize_tx_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    failure_code: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    failure_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class AnchorTransaction(Base):
    __tablename__ = "anchor_transactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    stellar_account_id: Mapped[str] = mapped_column(String(36), ForeignKey("stellar_accounts.id", ondelete="CASCADE"), nullable=False)
    kind: Mapped[str] = mapped_column(String(32), nullable=False)  # deposit, withdrawal
    asset_code: Mapped[str] = mapped_column(String(12), nullable=False)
    home_domain: Mapped[str] = mapped_column(String(255), nullable=False)
    sep24_transaction_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(64), nullable=False)
    interactive_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    more_info_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    amount_in: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    amount_out: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    stellar_transaction_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    external_transaction_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class StreamingConnection(Base):
    __tablename__ = "streaming_connections"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider: Mapped[str] = mapped_column(String(32), nullable=False)  # spotify, apple_music
    provider_account_id: Mapped[str] = mapped_column(String(255), nullable=False)
    access_token: Mapped[str] = mapped_column(Text, nullable=False)
    refresh_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="streaming_connections")


class TasteProfile(Base):
    __tablename__ = "taste_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    top_artists: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    top_genres: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    acousticness: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    danceability: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    energy: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    valence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    last_ingested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
