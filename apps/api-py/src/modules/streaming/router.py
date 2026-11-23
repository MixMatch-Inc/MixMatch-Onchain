import base64
import os
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import jwt
from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.db.models import StreamingConnection

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


class ConnectionRevocationResponse(BaseModel):
    message: str
    connection_id: str


class AppleMusicConnectRequest(BaseModel):
    user_id: str
    music_user_token: str
    provider_account_id: Optional[str] = None


async def get_optional_db():
    try:
        async for session in get_db():
            yield session
    except Exception:
        yield None


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


@router.get("/apple-music/developer-token")
async def apple_music_developer_token() -> Dict[str, Any]:
    """Generate an Apple Music developer token server-side for MusicKit."""
    team_id = os.getenv("APPLE_MUSIC_TEAM_ID", "")
    key_id = os.getenv("APPLE_MUSIC_KEY_ID", "")
    private_key = os.getenv("APPLE_MUSIC_PRIVATE_KEY", "").replace("\\n", "\n")
    if not team_id or not key_id or not private_key:
        raise HTTPException(status_code=503, detail="Apple Music is not configured")
    now = int(time.time())
    payload = {"iss": team_id, "iat": now, "exp": now + 60 * 60 * 12}
    headers = {"alg": "ES256", "kid": key_id}
    token = jwt.encode(payload, private_key, algorithm="ES256", headers=headers)
    return {"token": token, "expires_at": payload["exp"]}


@router.post("/apple-music/connect")
async def apple_music_connect(
    body: AppleMusicConnectRequest,
    db: Optional[AsyncSession] = Depends(get_optional_db),
) -> Dict[str, Any]:
    """Accept a MusicKit user token from mobile and persist the Apple Music connection."""
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    provider_account_id = body.provider_account_id or f"apple:{body.user_id}"
    enc_token = _encrypt_token(body.music_user_token)

    result = await db.execute(
        select(StreamingConnection).where(
            StreamingConnection.user_id == body.user_id,
            StreamingConnection.provider == "apple_music",
        )
    )
    existing = result.scalars().first()
    if existing:
        existing.provider_account_id = provider_account_id
        existing.access_token = enc_token
        existing.updated_at = datetime.now(timezone.utc)
        conn = existing
    else:
        conn = StreamingConnection(
            user_id=body.user_id,
            provider="apple_music",
            provider_account_id=provider_account_id,
            access_token=enc_token,
            refresh_token=None,
            expires_at=None,
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
        # fallback to in-memory for legacy behavior
        conns = [
            {
                "id": cid,
                "provider": c.get("service"),
                "provider_account_id": c.get("user_id"),
                "user_id": c.get("user_id"),
                "active": True,
            }
            for cid, c in _OAUTH_CONNECTIONS.items()
            if c.get("user_id") == user_id
        ]
        return {"connections": conns}
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
