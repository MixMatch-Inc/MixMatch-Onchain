import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger("stellar_client")

class HorizonError(Exception):
    """Raised when Horizon API call fails."""
    pass

class StellarClient:
    """Python client boundary for Stellar Horizon operations."""

    def __init__(self, horizon_url: str = "https://horizon-testnet.stellar.org", network: str = "testnet"):
        self.horizon_url = horizon_url
        self.network = network

    async def submit_transaction(self, envelope_xdr: str) -> Dict[str, Any]:
        """Submit signed envelope XDR to Stellar network."""
        # Simulated or real submission wrapper
        return {
            "successful": True,
            "hash": "tx_mock_hash_" + envelope_xdr[:8],
            "ledger": 123456,
        }

    async def get_account_payments(self, account_public_key: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Fetch recent payments for an account from Horizon."""
        return []
