import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from src.stellar.client import StellarBoundaryClient
from src.stellar.stream import subscribe_payment_stream

@pytest.mark.asyncio
async def test_stellar_client_get_account_success_and_not_found():
    """Issue #1155: Unit test StellarBoundaryClient get_account error handling and return shape."""
    client = StellarBoundaryClient(horizon_url="https://horizon-testnet.stellar.org")

    # Success case
    fake_account_data = {
        "id": "GAEXAMPLEPUBLICKEY1234567890",
        "balances": [{"asset_type": "native", "balance": "500.0000000"}],
        "sequence": "123456"
    }

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = fake_account_data
    mock_resp.raise_for_status = MagicMock()

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resp
        result = await client.get_account("GAEXAMPLEPUBLICKEY1234567890")
        assert result["id"] == "GAEXAMPLEPUBLICKEY1234567890"
        assert result["balances"][0]["balance"] == "500.0000000"

    # 404 Not Found case
    mock_404_resp = MagicMock()
    mock_404_resp.status_code = 404

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_404_resp
        with pytest.raises(ValueError, match="not found on Horizon"):
            await client.get_account("GAUNKNOWNACCOUNT")

@pytest.mark.asyncio
async def test_stellar_client_submit_transaction_and_stream():
    """Issue #1155: Unit test submit_transaction and payment stream subscription."""
    client = StellarBoundaryClient()

    mock_tx_resp = MagicMock()
    mock_tx_resp.status_code = 200
    mock_tx_resp.json.return_value = {"hash": "tx_hash_abc_123", "successful": True}
    mock_tx_resp.raise_for_status = MagicMock()

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_tx_resp
        tx_res = await client.submit_transaction("AAAAFkfakeEnvelopeXDR==")
        assert tx_res["hash"] == "tx_hash_abc_123"
        assert tx_res["successful"] is True

    # Test stream generator
    test_events = [
        {"id": "op_100", "type": "payment", "amount": "25.0"},
        {"id": "op_101", "type": "payment", "amount": "75.0"}
    ]
    collected = []
    async for event in subscribe_payment_stream("GAACCOUNT", mock_events=test_events):
        collected.append(event)
    assert len(collected) == 2
    assert collected[0]["id"] == "op_100"
