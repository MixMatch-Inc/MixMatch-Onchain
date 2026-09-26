import pytest
from unittest.mock import MagicMock, patch
from src.kms.client import VaultKmsClient, KmsUnavailableError

def test_kms_client_signing_success_with_mocked_vault():
    """Issue #1156: Unit test VaultKmsClient transit signing success path."""
    client = VaultKmsClient(vault_addr="http://127.0.0.1:8200", vault_token="test-token")

    fake_hvac = MagicMock()
    fake_hvac.is_authenticated.return_value = True
    fake_hvac.secrets.transit.sign_data.return_value = {
        "data": {"signature": "vault:v1:MEQCIDVfakeSignatures34872394723947=="}
    }
    fake_hvac.secrets.transit.verify_signed_data.return_value = {
        "data": {"valid": True}
    }

    with patch.object(client, "_get_client", return_value=fake_hvac):
        sig = client.sign(key_name="test-key", payload_bytes=b"sample-payload-data")
        assert sig == "vault:v1:MEQCIDVfakeSignatures34872394723947=="

        is_valid = client.verify(key_name="test-key", payload_bytes=b"sample-payload-data", signature=sig)
        assert is_valid is True

def test_kms_client_vault_unavailable_error_path():
    """Issue #1156: Unit test VaultKmsClient surfaces KmsUnavailableError when Vault is down."""
    client = VaultKmsClient(vault_addr="http://127.0.0.1:8200", vault_token="test-token")

    fake_hvac = MagicMock()
    fake_hvac.secrets.transit.sign_data.side_effect = RuntimeError("Connection refused to Vault daemon")

    with patch.object(client, "_get_client", return_value=fake_hvac):
        with pytest.raises(KmsUnavailableError, match="Vault KMS signing failed"):
            client.sign(key_name="test-key", payload_bytes=b"payload")
