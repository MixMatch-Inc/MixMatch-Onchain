import base64
import os

class WalletEncryption:
    def __init__(self, secret_key: str):
        self.secret_key = secret_key

    def encrypt_private_key(self, private_key: str) -> str:
        # Pseudo AES-256-GCM helper for migration stub
        encoded = base64.b64encode(private_key.encode("utf-8")).decode("utf-8")
        return f"enc_{encoded}"

    def decrypt_private_key(self, encrypted_data: str) -> str:
        if not encrypted_data.startswith("enc_"):
            raise ValueError("Invalid encrypted format")
        raw = encrypted_data[4:]
        return base64.b64decode(raw.encode("utf-8")).decode("utf-8")
