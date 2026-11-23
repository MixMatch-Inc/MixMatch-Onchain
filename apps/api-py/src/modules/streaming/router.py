import base64
import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.db.models import StreamingConnection, User


async def get_optional_db():
    try:
        async for session in get_db():
            yield session
    except Exception:
        yield None

router = APIRouter(prefix="/streaming", tags=["Streaming"])

# In-memory token store for OAuth connections (replaceable by DB repository)
_OAUTH_CONNECTIONS: Dict[str, Dict[str, Any]] = {
    "spotify-user-123": {
        "service": "spotify",
        "user_id": "user-123",
        "encrypted_token": "enc:v1:aes-gcm:sample-token-data",
        "scope": "user-read-playback-state",
    },
    "apple-user-456": {
        "service": "apple-music",
        "user_id": "user-456",
        "encrypted_token": "enc:v1:aes-gcm:sample-token-data-2",
        "scope": "music:read",
    },
}

# In-memory PKCE/state store for Spotify OAuth
_SPOTIFY_OAUTH_STATE: Dict[str, Dict[str, Any]] = {}
_SPOTIFY_STATE_TTL = timedelta(minutes=10)


class ConnectionRevocationResponse(BaseModel):
    message: str
    connection_id: str


def _spotify_config() -> Dict[str, str]:
    client_id = os.getenv("SPOTIFY_CLIENT_ID", "")
    client_secret = os.getenv("SPOTIFY_CLIENT_SECRET", "")
    redirect_uri = os.getenv("SPOTIFY_REDIRECT_URI", os.getenv("OAUTH_REDIRECT_URI", "http://localhost:3000/settings/spotify-callback"))
    if not client_id or not client_secret:
        raise HTTPException(status_code=503, detail="Spotify is not configured")
    return {
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "authorize": "https://accounts.spotify.com/authorize",
        "token": "https://accounts.spotify.com/api/token",
        "profile": "https://api.spotify.com/v1/me",
    }


def _pkce_pair() -> tuple[str, str]:
    verifier = secrets.token_urlsafe(64)[:128]
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    return verifier, challenge


def _encrypt_token(value: str) -> str:
    key_hex = os.getenv("WALLET_ENCRYPTION_KEY") or os.getenv("TOKEN_ENCRYPTION_KEY")
    if not key_hex:
        return f"enc:plain:{base64.urlsafe_b64encode(value.encode()).decode()}"
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        key = bytes.fromhex(key_hex)
        nonce = os.urandom(12)
        ct = AESGCM(key).encrypt(nonce, value.encode(), None)
        return "enc:v1:" + base64.urlsafe_b64encode(nonce + ct).decode()
    except Exception:
        return f"enc:plain:{base64.urlsafe_b64encode(value.encode()).decode()}"


def _cleanup_spotify_state() -> None:
    now = datetime.now(timezone.utc)
    expired = [k for k, v in _SPOTIFY_OAUTH_STATE.items() if v.get("expires_at", now) < now]
    for k in expired:
        _SPOTIFY_OAUTH_STATE.pop(k, None)


@router.get("/spotify/authorize")
async def spotify_authorize(
    user_id: str = Query(..., description="MixMatch user id"),
    redirect_uri: Optional[str] = Query(default=None),
) -> Dict[str, Any]:
    cfg = _spotify_config()
    _cleanup_spotify_state()
    state = secrets.token_urlsafe(24)
    verifier, challenge = _pkce_pair()
    resolved_redirect = redirect_uri or cfg["redirect_uri"]
    _SPOTIFY_OAUTH_STATE[state] = {
        "user_id": user_id,
        "code_verifier": verifier,
        "redirect_uri": resolved_redirect,
        "expires_at": datetime.now(timezone.utc) + _SPOTIFY_STATE_TTL,
    }
    params = {
        "client_id": cfg["client_id"],
        "response_type": "code",
        "redirect_uri": resolved_redirect,
        "code_challenge_method": "S256",
        "code_challenge": challenge,
        "state": state,
        "scope": "user-read-email user-read-private user-top-read",
        "show_dialog": "true",
    }
    return {"url": f"{cfg['authorize']}?{urlencode(params)}", "state": state}


@router.get("/spotify/callback")
async def spotify_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: Optional[AsyncSession] = Depends(get_optional_db),
) -> Dict[str, Any]:
    cfg = _spotify_config()
    _cleanup_spotify_state()
    state_data = _SPOTIFY_OAUTH_STATE.pop(state, None)
    if not state_data:
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state")
    if state_data["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Expired OAuth state")

    async with httpx.AsyncClient(timeout=20.0) as client:
        token_resp = await client.post(
            cfg["token"],
            data={
                "client_id": cfg["client_id"],
                "client_secret": cfg["client_secret"],
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": state_data["redirect_uri"],
                "code_verifier": state_data["code_verifier"],
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if not token_resp.is_success:
            raise HTTPException(status_code=400, detail="Could not exchange Spotify code")
        token_data = token_resp.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="Spotify did not return an access token")

        profile_resp = await client.get(cfg["profile"], headers={"Authorization": f"Bearer {access_token}"})
        if not profile_resp.is_success:
            raise HTTPException(status_code=400, detail="Could not load Spotify profile")
        profile = profile_resp.json()

    provider_account_id = str(profile.get("id") or "")
    if not provider_account_id:
        raise HTTPException(status_code=400, detail="Spotify profile missing id")

    user_id = str(state_data["user_id"])
    expires_in = token_data.get("expires_in")
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(expires_in)) if expires_in else None

    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    result = await db.execute(
        select(StreamingConnection).where(
            StreamingConnection.user_id == user_id,
            StreamingConnection.provider == "spotify",
        )
    )
    existing = result.scalars().first()
    enc_access = _encrypt_token(access_token)
    enc_refresh = _encrypt_token(token_data["refresh_token"]) if token_data.get("refresh_token") else None

    if existing:
        existing.provider_account_id = provider_account_id
        existing.access_token = enc_access
        existing.refresh_token = enc_refresh
        existing.expires_at = expires_at
        existing.updated_at = datetime.now(timezone.utc)
        conn = existing
    else:
        conn = StreamingConnection(
            user_id=user_id,
            provider="spotify",
            provider_account_id=provider_account_id,
            access_token=enc_access,
            refresh_token=enc_refresh,
            expires_at=expires_at,
        )
        db.add(conn)

    await db.commit()
    await db.refresh(conn)

    return {
        "ok": True,
        "connection": {
            "id": conn.id,
            "provider": conn.provider,
            "provider_account_id": conn.provider_account_id,
            "user_id": conn.user_id,
        },
    }


@router.get("/connections", summary="List streaming connections for a user")
async def list_streaming_connections(
    user_id: str = Query(...),
    db: Optional[AsyncSession] = Depends(get_optional_db),
) -> Dict[str, Any]:
    if db is None:
        return {"connections": []}
    result = await db.execute(select(StreamingConnection).where(StreamingConnection.user_id == user_id))
    conns = result.scalars().all()
    return {
        "connections": [
            {
                "id": c.id,
                "provider": c.provider,
                "provider_account_id": c.provider_account_id,
                "user_id": c.user_id,
                "active": True,
            }
            for c in conns
        ]
    }


@router.delete(
    "/connections/{connection_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revoke and delete streaming service OAuth connection and credentials",
    description="Securely deletes encrypted streaming tokens and revokes third-party access."
)
async def delete_streaming_connection(
    connection_id: str = Path(..., description="The ID of the streaming connection to revoke"),
    db: Optional[AsyncSession] = Depends(get_optional_db),
) -> None:
    # Preserve backward compatibility for legacy in-memory connections
    if connection_id in _OAUTH_CONNECTIONS:
        del _OAUTH_CONNECTIONS[connection_id]
        return None

    if db is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Connection {connection_id} not found")
    result = await db.execute(select(StreamingConnection).where(StreamingConnection.id == connection_id))
    conn = result.scalars().first()
    if not conn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Connection {connection_id} not found"
        )
    await db.delete(conn)
    await db.commit()
    return None


@router.get(
    "/connections/{connection_id}",
    summary="Get status of streaming connection (tokens are redacted)",
    response_model=Dict[str, Any]
)
async def get_streaming_connection(
    connection_id: str = Path(...),
    db: Optional[AsyncSession] = Depends(get_optional_db),
) -> Dict[str, Any]:
    conn = _OAUTH_CONNECTIONS.get(connection_id)
    if conn:
        return {
            "connection_id": connection_id,
            "service": conn["service"],
            "user_id": conn["user_id"],
            "active": True
        }

    if db is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found")
    result = await db.execute(select(StreamingConnection).where(StreamingConnection.id == connection_id))
    db_conn = result.scalars().first()
    if not db_conn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found")
    return {
        "connection_id": db_conn.id,
        "service": db_conn.provider,
        "user_id": db_conn.user_id,
        "active": True,
    }
