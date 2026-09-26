import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport
from src.main import app
from src.core.config import settings
from src.modules.taste.taste_cron import TasteCronScheduler
from src.modules.taste.service import TasteService
from src.stellar.client import StellarBoundaryClient
from src.stellar.stream import subscribe_payment_stream


@pytest.mark.asyncio
async def test_taste_cron_error_handling_and_gating():
    """Issue #1146: Verify cron error handling and start gating."""
    # When disabled by config
    scheduler = TasteCronScheduler()
    started = scheduler.start()
    assert started is False
    assert scheduler.is_running is False

    # Verify exception inside service does not raise out of callback
    mock_service = AsyncMock(spec=TasteService)
    mock_service.execute_nightly_computation_batch.side_effect = RuntimeError("Database connection timed out")
    safe_scheduler = TasteCronScheduler(service=mock_service)
    success = await safe_scheduler.run_job_callback()
    assert success is False  # Trapped gracefully


@pytest.mark.asyncio
async def test_taste_router_endpoints():
    """Issue #1147: Verify GET /api/taste/health and GET /api/taste/profile/{id}."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        health_resp = await client.get("/api/taste/health")
        assert health_resp.status_code == 200
        data = health_resp.json()
        assert data["status"] == "healthy"
        assert data["is_stub"] is True
        assert data["cron_enabled"] is False

        profile_resp = await client.get("/api/taste/profile/user-abc-123")
        assert profile_resp.status_code == 200
        profile = profile_resp.json()
        assert profile["user_id"] == "user-abc-123"
        assert "indie-rock" in profile["top_genres"]
        assert profile["is_mock"] is True


@pytest.mark.asyncio
async def test_stellar_boundary_client_interface():
    """Issue #1148: Verify Python boundary client interface for Horizon calls."""
    client = StellarBoundaryClient(horizon_url="https://horizon-testnet.stellar.org")
    assert client.horizon_url == "https://horizon-testnet.stellar.org"
    assert hasattr(client, "get_account")
    assert hasattr(client, "submit_transaction")
    assert hasattr(client, "get_transaction")


@pytest.mark.asyncio
async def test_horizon_payment_stream_generator():
    """Issue #1149: Verify payment stream async generator yields events."""
    test_events = [
        {"id": "evt-1", "type": "payment", "amount": "100.50", "asset_code": "XLM"},
        {"id": "evt-2", "type": "payment", "amount": "50.00", "asset_code": "USDC"}
    ]
    received = []
    async for event in subscribe_payment_stream(
        account_id="GAAATESTACCOUNT",
        mock_events=test_events
    ):
        received.append(event)

    assert len(received) == 2
    assert received[0]["id"] == "evt-1"
    assert received[1]["asset_code"] == "USDC"
