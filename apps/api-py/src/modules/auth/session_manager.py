"""session_manager.py – refresh-token rotation and server-side revocation (issue #1490).

Standalone helper. Import and call from an auth router; does not touch
existing routes or the main.py file.
"""
from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import String, DateTime, Boolean
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

# Short-lived access tokens (15 min) + rotating refresh tokens (7 days)
ACCESS_TOKEN_TTL = timedelta(minutes=15)
REFRESH_TOKEN_TTL = timedelta(days=7)


class SessionBase(DeclarativeBase):
    pass


class RefreshTokenRecord(SessionBase):
    """One row per issued refresh token.

    Token values are stored as SHA-256 hashes; never store raw tokens.
    """

    __tablename__ = "refresh_tokens"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    device_hint: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)


def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


async def issue_refresh_token(
    session: AsyncSession,
    user_id: str,
    device_hint: Optional[str] = None,
) -> str:
    """Mint a new refresh token, persist its hash, and return the raw value."""
    raw = secrets.token_urlsafe(48)
    now = datetime.now(timezone.utc)
    record = RefreshTokenRecord(
        user_id=user_id,
        token_hash=_hash_token(raw),
        issued_at=now,
        expires_at=now + REFRESH_TOKEN_TTL,
        device_hint=device_hint,
    )
    session.add(record)
    await session.flush()
    return raw


async def rotate_refresh_token(
    session: AsyncSession,
    raw_token: str,
) -> Optional[str]:
    """Validate, revoke and replace a refresh token (rotation).

    Returns the new raw token on success, or None if the token is
    invalid, expired or already revoked.
    """
    token_hash = _hash_token(raw_token)
    result = await session.execute(
        select(RefreshTokenRecord).where(RefreshTokenRecord.token_hash == token_hash)
    )
    record = result.scalar_one_or_none()
    now = datetime.now(timezone.utc)
    if record is None or record.revoked or record.expires_at < now:
        return None

    record.revoked = True
    await session.flush()
    return await issue_refresh_token(session, record.user_id, record.device_hint)


async def revoke_all_sessions(session: AsyncSession, user_id: str) -> int:
    """Revoke every active session for a user (e.g. on password change).

    Returns the count of rows revoked.
    """
    result = await session.execute(
        update(RefreshTokenRecord)
        .where(RefreshTokenRecord.user_id == user_id, RefreshTokenRecord.revoked.is_(False))
        .values(revoked=True)
        .returning(RefreshTokenRecord.id)
    )
    await session.flush()
    return len(result.fetchall())
