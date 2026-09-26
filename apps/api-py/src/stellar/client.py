from typing import Dict, Any, Optional
import httpx
from src.core.config import settings

class StellarBoundaryClient:
    """
    Port #1148: Python boundary wrapper replacing @mixmatch/stellar TypeScript package calls.
    Provides standard methods for account balances, payment submission, and transaction status queries.
    """

    def __init__(self, horizon_url: Optional[str] = None, network_passphrase: Optional[str] = None):
        self.horizon_url = (horizon_url or settings.HORIZON_URL).rstrip("/")
        self.network = settings.STELLAR_NETWORK

    async def get_account(self, public_key: str) -> Dict[str, Any]:
        """Fetches account details and balances from Horizon."""
        url = f"{self.horizon_url}/accounts/{public_key}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            if resp.status_code == 404:
                raise ValueError(f"Account {public_key} not found on Horizon ({self.network})")
            resp.raise_for_status()
            return resp.json()

    async def submit_transaction(self, envelope_xdr: str) -> Dict[str, Any]:
        """Submits base64-encoded transaction envelope to Horizon."""
        url = f"{self.horizon_url}/transactions"
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, data={"tx": envelope_xdr})
            resp.raise_for_status()
            return resp.json()

    async def get_transaction(self, tx_hash: str) -> Dict[str, Any]:
        """Fetches transaction by hash."""
        url = f"{self.horizon_url}/transactions/{tx_hash}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            if resp.status_code == 404:
                raise ValueError(f"Transaction {tx_hash} not found on Horizon")
            resp.raise_for_status()
            return resp.json()
