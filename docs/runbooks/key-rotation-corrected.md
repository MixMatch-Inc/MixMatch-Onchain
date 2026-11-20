# Key Rotation Runbook (Corrected)

> Issue #1484 – replaces broken references in `docs/key-rotation-runbook.md`.

## Background

The original runbook referenced:
- `ENCRYPTION_KEY_PRIMARY`, `ENCRYPTION_KEY_LEGACY`, `ENCRYPTION_KEY_V1/V2` – **these env vars do not exist**.
- `python -m apps.api-py.src.scripts.rotate_keys` – **this module does not exist** (hyphenated package names cannot be imported; `apps/api-py/src/scripts/` is absent).
- Actual config has only: `WALLET_ENCRYPTION_KEY` (a 64-char hex AES-256 key).

## Real Key Rotation Procedure

### Prerequisites

- Vault is unsealed and AppRole credentials are valid.
- A maintenance window is scheduled (payments will be briefly unavailable).

### Steps

1. **Generate a new key** in Vault Transit:
   ```bash
   vault write -f transit/keys/wallet-key/rotate
   # Note the new key version number
   vault read transit/keys/wallet-key | grep latest_version
   ```

2. **Re-encrypt all wallet blobs** (run in a transaction):
   ```python
   # scripts/rotate_wallet_keys.py  (to be implemented)
   # For each user:
   #   plaintext = vault.decrypt(old_ciphertext)
   #   new_ciphertext = vault.encrypt(plaintext, key_version=new_version)
   #   db.update(user_id, encrypted_key=new_ciphertext)
   ```

3. **Update `WALLET_ENCRYPTION_KEY`** only if the legacy AES path (non-Vault)
   is still in use. Set the new 64-char hex value in the secret manager;
   do not commit it to source control.

4. **Verify**: spot-check 10 wallets by decrypting and comparing public keys.

5. **Revoke the old Vault key version**:
   ```bash
   vault write transit/keys/wallet-key/trim min_available_version=<new_version>
   ```

6. **Write an audit log entry** with `action=KEY_USE`, `detail=rotation`.

## Rollback

If re-encryption fails mid-run, do not revoke the old key version.
The previous ciphertext remains readable; re-run from step 2.
