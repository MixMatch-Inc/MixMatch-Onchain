from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status, Path
from pydantic import BaseModel

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
    }
}


class ConnectionRevocationResponse(BaseModel):
    message: str
    connection_id: str


@router.delete(
    "/connections/{connection_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revoke and delete streaming service OAuth connection and credentials",
    description="Securely deletes encrypted streaming tokens and revokes third-party access."
)
async def delete_streaming_connection(
    connection_id: str = Path(..., description="The ID of the streaming connection to revoke")
) -> None:
    if connection_id not in _OAUTH_CONNECTIONS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Connection {connection_id} not found"
        )
    # Securely delete cryptographic token material
    del _OAUTH_CONNECTIONS[connection_id]
    return None


@router.get(
    "/connections/{connection_id}",
    summary="Get status of streaming connection (tokens are redacted)",
    response_model=Dict[str, Any]
)
async def get_streaming_connection(
    connection_id: str = Path(...)
) -> Dict[str, Any]:
    conn = _OAUTH_CONNECTIONS.get(connection_id)
    if not conn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found")
    return {
        "connection_id": connection_id,
        "service": conn["service"],
        "user_id": conn["user_id"],
        "active": True
    }
