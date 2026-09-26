import base64
import logging
from typing import Optional, Dict, Any
from src.core.config import settings

logger = logging.getLogger("kms.vault")

class KmsUnavailableError(Exception):
    """Raised when Vault KMS endpoint is unreachable, timed out, or unconfigured."""
    pass

class VaultKmsClient:
    """
    Port #1151: Python client interface boundary for @mixmatch/kms Vault transit engine.
    Matches TypeScript KMS signatures for signing and verification.
    """

    def __init__(
        self,
        vault_addr: Optional[str] = None,
        vault_token: Optional[str] = None,
        mount_point: str = "transit",
        mock_mode: bool = False
    ):
        self.vault_addr = vault_addr or settings.VAULT_ADDR or "http://127.0.0.1:8200"
        self.vault_token = vault_token or settings.VAULT_TOKEN or "root"
        self.mount_point = mount_point
        self.mock_mode = mock_mode
        self._client = None

    def _get_client(self):
        if self._client is None:
            try:
                import hvac
                self._client = hvac.Client(url=self.vault_addr, token=self.vault_token)
            except Exception as e:
                raise KmsUnavailableError(f"Failed to initialize Vault client: {e}")
        return self._client

    def sign(
        self,
        key_name: str,
        payload_bytes: bytes,
        hash_algorithm: str = "sha2-256",
        key_version: Optional[int] = None
    ) -> str:
        """
        Signs binary payload using Vault transit secret engine.
        Returns signature format: vault:v1:<base64-signature> (standard Vault format matching TS KMS).
        """
        if self.mock_mode:
            sig_raw = base64.b64encode(b"simulated_vault_sig:" + payload_bytes[:16]).decode()
            version = key_version or 1
            return f"vault:v{version}:{sig_raw}"

        try:
            b64_input = base64.b64encode(payload_bytes).decode("utf-8")
            client = self._get_client()
            res = client.secrets.transit.sign_data(
                name=key_name,
                input=b64_input,
                hash_algorithm=hash_algorithm,
                key_version=key_version,
                mount_point=self.mount_point
            )
            return res["data"]["signature"]
        except Exception as e:
            logger.error("Vault KMS sign error on key %s: %s", key_name, str(e))
            raise KmsUnavailableError(f"Vault KMS signing failed: {str(e)}")

    def verify(
        self,
        key_name: str,
        payload_bytes: bytes,
        signature: str,
        hash_algorithm: str = "sha2-256"
    ) -> bool:
        """Verifies signature against Vault transit key."""
        if self.mock_mode:
            return signature.startswith("vault:v")

        try:
            b64_input = base64.b64encode(payload_bytes).decode("utf-8")
            client = self._get_client()
            res = client.secrets.transit.verify_signed_data(
                name=key_name,
                input=b64_input,
                signature=signature,
                hash_algorithm=hash_algorithm,
                mount_point=self.mount_point
            )
            return bool(res["data"]["valid"])
        except Exception as e:
            logger.error("Vault KMS verify error on key %s: %s", key_name, str(e))
            raise KmsUnavailableError(f"Vault KMS verification failed: {str(e)}")
