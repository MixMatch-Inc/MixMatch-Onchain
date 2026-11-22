import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.database import get_db
from src.core.security import CurrentUser, get_current_user
from src.db.models import EmailToken, User
from src.modules.auth.session_manager import revoke_all_sessions
from src.modules.mailer import Mailer, EmailMessageInput
from src.modules.users.service import UsersService

router = APIRouter(prefix="/auth", tags=["Account security"])

RESET_TTL = timedelta(minutes=30)
VERIFY_TTL = timedelta(days=7)
mailer = Mailer()


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=20)
    new_password: str = Field(..., min_length=8, max_length=128)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)


class VerifyRequest(BaseModel):
    token: str = Field(..., min_length=20)


class MessageResponse(BaseModel):
    message: str


def _hash(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


async def _issue_token(db: AsyncSession, user: User, purpose: str, ttl: timedelta) -> str:
    raw = secrets.token_urlsafe(48)
    db.add(
        EmailToken(
            id=str(uuid.uuid4()),
            user_id=user.id,
            token_hash=_hash(raw),
            purpose=purpose,
            expires_at=datetime.now(timezone.utc) + ttl,
        )
    )
    await db.flush()
    return raw


async def _consume_token(db: AsyncSession, raw: str, purpose: str) -> EmailToken:
    result = await db.execute(
        select(EmailToken).where(
            EmailToken.token_hash == _hash(raw),
            EmailToken.purpose == purpose,
            EmailToken.used_at.is_(None),
        )
    )
    record = result.scalar_one_or_none()
    if record is None or record.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="This link is invalid or has expired")
    record.used_at = datetime.now(timezone.utc)
    await db.flush()
    return record


@router.post("/password/forgot", response_model=MessageResponse)
async def forgot_password(body: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    service = UsersService(db)
    user = await service.repo.get_by_email(body.email)
    if user:
        token = await _issue_token(db, user, "password_reset", RESET_TTL)
        link = f"{settings.APP_FRONTEND_URL}/reset-password?token={token}"
        mailer.send(
            EmailMessageInput(
                to=user.email,
                subject="Reset your MixMatch password",
                text=f"Use this single-use link within 30 minutes: {link}",
            )
        )
        await db.commit()
    return MessageResponse(message="If that email exists, a reset link has been sent")


@router.post("/password/reset", response_model=MessageResponse)
async def reset_password(body: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    record = await _consume_token(db, body.token, "password_reset")
    service = UsersService(db)
    user = await service.repo.get_by_id(record.user_id)
    if user is None:
        raise HTTPException(status_code=400, detail="This link is invalid")
    user.password_hash = service.hash_password(body.new_password)
    await revoke_all_sessions(db, user.id)
    await db.execute(update(EmailToken).where(EmailToken.user_id == user.id, EmailToken.used_at.is_(None)).values(used_at=datetime.now(timezone.utc)))
    await db.commit()
    return MessageResponse(message="Password reset. Please sign in again.")


@router.post("/password/change", response_model=MessageResponse)
async def change_password(
    body: ChangePasswordRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = UsersService(db)
    user = await service.repo.get_by_id(current_user.id)
    if user is None or not user.password_hash or not service.verify_password(body.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    user.password_hash = service.hash_password(body.new_password)
    await revoke_all_sessions(db, user.id)
    await db.commit()
    return MessageResponse(message="Password changed. Other sessions have been signed out.")


@router.post("/email/send-verification", response_model=MessageResponse)
async def send_verification(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = UsersService(db)
    user = await service.repo.get_by_id(current_user.id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.email_verified_at:
        return MessageResponse(message="Email already verified")
    token = await _issue_token(db, user, "email_verify", VERIFY_TTL)
    link = f"{settings.APP_FRONTEND_URL}/verify-email?token={token}"
    mailer.send(
        EmailMessageInput(
            to=user.email,
            subject="Verify your MixMatch email",
            text=f"Verify your email within 7 days: {link}",
        )
    )
    await db.commit()
    return MessageResponse(message="Verification email sent")


@router.post("/email/verify", response_model=MessageResponse)
async def verify_email(body: VerifyRequest, db: AsyncSession = Depends(get_db)):
    record = await _consume_token(db, body.token, "email_verify")
    result = await db.execute(select(User).where(User.id == record.user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=400, detail="This link is invalid")
    user.email_verified_at = datetime.now(timezone.utc)
    await db.commit()
    return MessageResponse(message="Email verified")
