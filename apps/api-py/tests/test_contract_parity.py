import pytest
from httpx import AsyncClient, ASGITransport
from src.main import app

@pytest.mark.asyncio
async def test_contract_parity_key_routes(test_api_client):
    """Issue #1164: Contract parity verification for key API routes."""
    # 1. Health
    h = await test_api_client.get("/health")
    assert h.status_code == 200
    assert "status" in h.json()

    # 2. Taste Health
    th = await test_api_client.get("/api/taste/health")
    assert th.status_code == 200
    assert th.json()["status"] == "healthy"

    # 3. Payments History schema
    ph = await test_api_client.get("/api/payments/history")
    assert ph.status_code == 200
    data = ph.json()
    assert "transactions" in data
    assert "total" in data
    assert "page" in data
