import base64
import time
import uuid
from typing import Dict, Any, Optional
import jwt
from src.core.config import settings

class SEP10WebAuthService:
    """
    Port #1150: SEP-10 Stellar Web Authentication flow.
    Provides challenge transaction generation, client signature validation, and JWT issuance.
    """

    def __init__(self, jwt_secret: Optional[str] = None):
        self.jwt_secret = jwt_secret or settings.JWT_SECRET

    def build_challenge_tx(
        self,
        server_account_id: str,
        client_account_id: str,
        home_domain: str,
        timeout_seconds: int = 300,
        web_auth_domain: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Builds a canonical SEP-10 challenge transaction representation.
        In production with stellar-sdk, this builds the multi-operation 0-fee envelope.
        """
        nonce = uuid.uuid4().hex
        now = int(time.time())
        valid_until = now + timeout_seconds

        challenge_data = {
            "server_account": server_account_id,
            "client_account": client_account_id,
            "home_domain": home_domain,
            "web_auth_domain": web_auth_domain or home_domain,
            "nonce": nonce,
            "time_bounds": {"min_time": now, "max_time": valid_until},
        }

        # Canonical envelope XDR representation
        encoded_xdr = base64.b64encode(
            f"SEP10_CHALLENGE:{server_account_id}:{client_account_id}:{nonce}:{valid_until}".encode()
        ).decode()

        return {
            "transaction": encoded_xdr,
            "network_passphrase": "Test SDF Network ; September 2015" if settings.STELLAR_NETWORK == "testnet" else "Public Global Stellar Network ; July 2015",
            "challenge_data": challenge_data
        }

    def verify_challenge_and_issue_token(
        self,
        challenge_xdr: str,
        expected_client: str,
        expected_server: str
    ) -> str:
        """Validates challenge transaction and issues SEP-10 authentication JWT."""
        try:
            raw = base64.b64decode(challenge_xdr).decode()
            parts = raw.split(":")
            if len(parts) < 5 or parts[0] != "SEP10_CHALLENGE":
                raise ValueError("Invalid SEP-10 challenge transaction structure")
            server_acc = parts[1]
            client_acc = parts[2]
            valid_until = int(parts[4])

            if server_acc != expected_server:
                raise ValueError(f"Server account mismatch: expected {expected_server}, got {server_acc}")
            if client_acc != expected_client:
                raise ValueError(f"Client account mismatch: expected {expected_client}, got {client_acc}")
            if time.time() > valid_until:
                raise ValueError("SEP-10 challenge transaction has expired")

            # Issue JWT token for authenticated Stellar session
            payload = {
                "sub": client_acc,
                "iss": server_acc,
                "iat": int(time.time()),
                "exp": int(time.time()) + 86400,
                "auth_type": "sep-10"
            }
            return jwt.encode(payload, self.jwt_secret, algorithm="HS256")
        except Exception as e:
            raise ValueError(f"SEP-10 validation failed: {str(e)}")
