import pytest
from unittest.mock import patch, MagicMock
from src.kms.client import KmsUnavailableError, VaultKmsClient
from src.modules.payments.wallet_resolver import WalletResolver
from src.modules.payments.errors import WalletResolutionError
from src.db.models import StellarAccount

@pytest.mark.asyncio
async def test_vault_unreachable_error_path():
    """Issue #1160: Signing fails loudly with 503 VAULT_KMS_SIGNING_UNAVAILABLE if Vault is unreachable."""
    resolver = WalletResolver()
    account = StellarAccount(
        id="acc-test-uuid",
        user_id="user-test-uuid",
        public_key="GATESTACCOUNTKEY12345678901234567890123456789012345678",
        signing_key_id="vault-key-id-primary"
    )

    with patch.object(VaultKmsClient, "_get_client", side_effect=KmsUnavailableError("Connection refused:8200")):
        with pytest.raises(WalletResolutionError) as exc_info:
            await resolver.resolve_wallet(account)

        err = exc_info.value
        assert err.status_code == 503
        assert err.code == "VAULT_KMS_SIGNING_UNAVAILABLE"
        assert "unreachable" in err.message

@pytest.mark.asyncio
async def test_shared_conftest_fixtures(test_api_client, auth_token_factory):
    """Issue #1161: Verify shared conftest fixture suite provides working client and auth tokens."""
    # Mint token
    token = auth_token_factory(user_id="admin-user-id", role="admin")
    assert isinstance(token, str)

    # Test client request
    resp = await test_api_client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
