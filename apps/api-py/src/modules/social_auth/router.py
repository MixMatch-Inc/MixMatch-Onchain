import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from urllib.parse import urlencode

import httpx
import jwt
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.database import get_db
from src.db.models import SocialAccount, User
from src.modules.users.service import UsersService

router = APIRouter(prefix="/auth/social", tags=["Social login"])

OAUTH_STATE_TTL = timedelta(minutes=10)
PROVIDERS = {
    "google": {
        "authorize": "https://accounts.google.com/o/oauth2/v2/auth",
        "token": "https://oauth2.googleapis.com/token",
        "userinfo": "https://openidconnect.googleapis.com/v1/userinfo",
        "scope": "openid email profile",
    },
    "apple": {
        "authorize": "https://appleid.apple.com/auth/authorize",
        "token": "https://appleid.apple.com/auth/token",
        "userinfo": None,
        "scope": "name email",
    },
}


class SocialCallbackRequest(BaseModel):
    code: str = Field(..., min_length=1)
    state: str = Field(..., min_length=1)


class SocialAuthResponse(BaseModel):
    accessToken: str
    user: Dict[str, Any]


def _provider_config(provider: str) -> Dict[str, Any]:
    config = PROVIDERS.get(provider)
    if not config:
        raise HTTPException(status_code=404, detail="Unknown social provider")
    client_id = getattr(settings, f"{provider.upper()}_CLIENT_ID")
    client_secret = getattr(settings, f"{provider.upper()}_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise HTTPException(status_code=503, detail=f"{provider.title()} login is not configured")
    return {**config, "client_id": client_id, "client_secret": client_secret}


def _allowed_redirects() -> set[str]:
    return {settings.OAUTH_REDIRECT_URI, settings.OAUTH_MOBILE_REDIRECT_URI}


def _issue_state(provider: str, redirect_uri: str) -> str:
    payload = {
        "provider": provider,
        "redirect_uri": redirect_uri,
        "nonce": secrets.token_urlsafe(16),
        "exp": datetime.now(timezone.utc) + OAUTH_STATE_TTL,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


def _verify_state(state: str, provider: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(state, settings.JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=400, detail="Invalid OAuth state") from exc
    if payload.get("provider") != provider:
        raise HTTPException(status_code=400, detail="OAuth provider mismatch")
    if payload.get("redirect_uri") not in _allowed_redirects():
        raise HTTPException(status_code=400, detail="Invalid OAuth redirect URI")
    return payload


def _issue_access_token(user: User) -> str:
    payload = {
        "sub": user.id,
        "email": user.email,
        "role": user.role,
        "exp": datetime.now(timezone.utc) + timedelta(seconds=settings.JWT_EXPIRATION_DELTA_SECONDS),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


async def _linked_user_from_header(authorization: Optional[str], service: UsersService) -> Optional[User]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        payload = jwt.decode(authorization.removeprefix("Bearer "), settings.JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid access token") from exc
    user = await service.repo.get_by_id(str(payload.get("sub", "")))
    if not user:
        raise HTTPException(status_code=401, detail="Invalid access token")
    return user


@router.get("/{provider}/url")
async def social_auth_url(provider: str, redirect_uri: Optional[str] = Query(default=None)):
    config = _provider_config(provider)
    resolved_redirect_uri = redirect_uri or settings.OAUTH_REDIRECT_URI
    if resolved_redirect_uri not in _allowed_redirects():
        raise HTTPException(status_code=400, detail="Invalid OAuth redirect URI")
    state = _issue_state(provider, resolved_redirect_uri)
    params = {
        "client_id": config["client_id"],
        "redirect_uri": resolved_redirect_uri,
        "response_type": "code",
        "scope": config["scope"],
        "state": state,
        "access_type": "offline",
        "prompt": "select_account",
    }
    return {"url": f"{config['authorize']}?{urlencode(params)}", "state": state}


@router.post("/{provider}/callback", response_model=SocialAuthResponse)
async def social_callback(
    provider: str,
    body: SocialCallbackRequest,
    db: AsyncSession = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
):
    config = _provider_config(provider)
    state_payload = _verify_state(body.state, provider)

    async with httpx.AsyncClient(timeout=15.0) as client:
        token_response = await client.post(
            config["token"],
            data={
                "client_id": config["client_id"],
                "client_secret": config["client_secret"],
                "code": body.code,
                "grant_type": "authorization_code",
                "redirect_uri": state_payload["redirect_uri"],
            },
        )
        if not token_response.is_success:
            raise HTTPException(status_code=400, detail="Could not exchange the social login code")
        token_data = token_response.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="Social provider did not return an access token")

        if provider == "google":
            info_response = await client.get(config["userinfo"], headers={"Authorization": f"Bearer {access_token}"})
            if not info_response.is_success:
                raise HTTPException(status_code=400, detail="Could not load Google profile")
            profile = info_response.json()
        else:
            id_token = token_data.get("id_token")
            if not id_token:
                raise HTTPException(status_code=400, detail="Apple did not return an identity token")
            profile = jwt.decode(id_token, options={"verify_signature": False})

    email = profile.get("email")
    provider_account_id = profile.get("sub")
    if not provider_account_id or not email:
        raise HTTPException(status_code=400, detail="Social profile is missing email or subject")
    if not profile.get("email_verified", True):
        raise HTTPException(status_code=403, detail="A verified email is required for social login")

    service = UsersService(db)
    linked_user = await _linked_user_from_header(authorization, service)
    if linked_user and linked_user.email.lower() != email.lower():
        raise HTTPException(status_code=403, detail="Social account email must match your MixMatch email")

    existing_social = (
        await db.execute(
            select(SocialAccount).where(
                SocialAccount.provider == provider,
                SocialAccount.provider_account_id == provider_account_id,
            )
        )
    ).scalar_one_or_none()
    if existing_social:
        if linked_user and existing_social.user_id != linked_user.id:
            raise HTTPException(status_code=409, detail="This social account is already linked to another user")
        user = await service.repo.get_by_id(existing_social.user_id)
        existing_social.encrypted_token = f"enc:v1:{access_token}"
        existing_social.last_sync_at = datetime.now(timezone.utc)
    else:
        user = linked_user or await service.repo.get_by_email(email)
        if user and user.password_hash and not linked_user:
            raise HTTPException(status_code=409, detail="Sign in with your password first, then link this provider in settings")
        if not user:
            user = await service.repo.create_user(
                email=email,
                password_hash="",
                display_name=str(profile.get("name") or email.split("@")[0]),
            )
        db.add(
            SocialAccount(
                id=str(uuid.uuid4()),
                user_id=user.id,
                provider=provider,
                provider_account_id=provider_account_id,
                email=email,
                email_verified=True,
                encrypted_token=f"enc:v1:{access_token}",
                scope=config["scope"],
                last_sync_at=datetime.now(timezone.utc),
            )
        )
    await db.commit()
    await db.refresh(user)

    token = _issue_access_token(user)
    return SocialAuthResponse(
        accessToken=token,
        user={
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "createdAt": user.created_at.isoformat(),
            "updatedAt": user.updated_at.isoformat(),
        },
    )
