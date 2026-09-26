import base64
import os
from typing import Optional
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from src.core.config import settings
from src.db.models import StellarAccount
from src.modules.payments.errors import WalletResolutionError

class ResolvedWallet:
    def __init__(self, public_key: str, secret_key: Optional[str] = None, signing_key_id: Optional[str] = None):
        self.public_key = public_key
        self.secret_key = secret_key
        self.signing_key_id = signing_key_id

    @property
    def is_vault(self) -> bool:
        return self.signing_key_id is not None

class WalletResolver:
    """Port #1124: Resolves and decrypts Stellar wallet for signing with controlled error path."""

    def __init__(self, encryption_key_hex: Optional[str] = None, encryption_key: Optional[bytes] = None):
        if encryption_key is not None:
            self.encryption_key = encryption_key
        else:
            self.encryption_key = bytes.fromhex(encryption_key_hex or settings.WALLET_ENCRYPTION_KEY)

    def decrypt_secret_key(self, encrypted_payload: str) -> str:
        """Decrypts AES-256-GCM encrypted secret key.
        Format expected: base64(iv:12B + ciphertext + tag:16B)
        """
        try:
            raw = base64.b64decode(encrypted_payload)
            if len(raw) < 28:
                raise ValueError("Ciphertext too short")
            iv = raw[:12]
            ciphertext_and_tag = raw[12:]
            aesgcm = AESGCM(self.encryption_key)
            decrypted = aesgcm.decrypt(iv, ciphertext_and_tag, None)
            return decrypted.decode("utf-8")
        except Exception as e:
            # Port #1124: Controlled error path for malformed encrypted key instead of unhandled 500
            raise WalletResolutionError(
                message=f"Failed to decrypt wallet secret key: malformed key material ({e})",
                code="MALFORMED_ENCRYPTED_KEY",
                status_code=422,
            )

    def encrypt_secret_key(self, secret_key: str) -> str:
        """Encrypts secret key using AES-256-GCM."""
        iv = os.urandom(12)
        aesgcm = AESGCM(self.encryption_key)
        ciphertext = aesgcm.encrypt(iv, secret_key.encode("utf-8"), None)
        return base64.b64encode(iv + ciphertext).decode("utf-8")

    async def resolve_wallet(self, account: StellarAccount) -> ResolvedWallet:
        if account.signing_key_id:
            return ResolvedWallet(
                public_key=account.public_key,
                signing_key_id=account.signing_key_id,
            )
        elif account.encrypted_secret_key:
            decrypted = self.decrypt_secret_key(account.encrypted_secret_key)
            return ResolvedWallet(
                public_key=account.public_key,
                secret_key=decrypted,
            )
        else:
            raise WalletResolutionError(
                message=f"Account {account.id} has no valid signing mechanism configured",
                code="NO_SIGNING_MECHANISM",
                status_code=422,
            )


def rotate_wallet_key(encrypted_blob: str, old_key: bytes, new_key: bytes) -> str:
    """
    Re-encrypts a wallet secret blob from old_key to new_key.
    Supports versioned or standard IV/tag format.
    """
    resolver = WalletResolver(encryption_key=old_key)
    decrypted_secret = resolver.decrypt_secret_key(encrypted_blob)
    new_resolver = WalletResolver(encryption_key=new_key)
    return new_resolver.encrypt_secret_key(decrypted_secret)
