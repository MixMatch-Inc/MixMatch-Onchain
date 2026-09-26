import pytest
from httpx import AsyncClient, ASGITransport
from src.main import app
from src.core.config import get_settings
from src.modules.payments.wallet_resolver import WalletResolver, rotate_wallet_key
from src.modules.streaming.router import _OAUTH_CONNECTIONS


@pytest.mark.asyncio
async def test_openapi_schema_contract():
    """Issue #1142: Verify OpenAPI docs schema covers payments, admin, anchor, escrow, streaming."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/openapi.json")
        assert response.status_code == 200
        schema = response.json()
        assert "paths" in schema
        paths = schema["paths"]
        assert "/api/payments/send" in paths
        assert "/api/payments/{id}/status" in paths
        assert "/api/payments/history" in paths
        assert "/api/payments/stream" in paths
        assert "/api/admin/transactions/{id}/approve" in paths
        assert "/api/admin/transactions/{id}/reject" in paths
        assert "/api/anchor/deposit" in paths
        assert "/api/anchor/withdraw" in paths
        assert "/api/escrows" in paths
        assert "/api/streaming/connections/{connection_id}" in paths


@pytest.mark.asyncio
async def test_streaming_oauth_token_deletion():
    """Issue #1143: Verify DELETE /streaming/connections/:id revokes tokens."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Check active connection exists
        assert "spotify-user-123" in _OAUTH_CONNECTIONS
        
        # Delete connection
        del_resp = await client.delete("/api/streaming/connections/spotify-user-123")
        assert del_resp.status_code == 204
        assert "spotify-user-123" not in _OAUTH_CONNECTIONS

        # Second deletion should return 404
        del_resp2 = await client.delete("/api/streaming/connections/spotify-user-123")
        assert del_resp2.status_code == 404


@pytest.mark.asyncio
async def test_wallet_key_rotation_helper():
    """Issue #1144: Verify re-encryption from old key to new key."""
    old_key = b"old_secret_key_32_bytes_test!!!!"
    new_key = b"new_secret_key_32_bytes_test!!!!"
    raw_secret = "SCVJ366TESTINGSECRETKYYY"

    old_resolver = WalletResolver(encryption_key=old_key)
    encrypted_blob = old_resolver.encrypt_secret_key(raw_secret)

    # Rotate
    rotated_blob = rotate_wallet_key(encrypted_blob, old_key=old_key, new_key=new_key)
    assert rotated_blob != encrypted_blob

    # Decrypt with new resolver
    new_resolver = WalletResolver(encryption_key=new_key)
    decrypted = new_resolver.decrypt_secret_key(rotated_blob)
    assert decrypted == raw_secret


def test_taste_module_cron_disabled_by_default():
    """Issue #1145: Verify taste cron is disabled by default in settings."""
    settings = get_settings()
    assert settings.enable_taste_cron is False
