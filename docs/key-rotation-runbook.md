# Wallet Encryption Key Rotation Strategy & Runbook

## Overview
MixMatch stores custodial or transit wallet secret keys encrypted at rest using AES-256-GCM.
To meet SOC2/PCI-DSS and high security standards, cryptographic key material must support zero-downtime rotation.

## Ciphertext Format
Ciphertext envelopes are version-prefixed:
```
v<version>:<salt_hex>:<iv_hex>:<tag_hex>:<ciphertext_hex>
```
Example:
`v1:0102030405060708090a0b0c0d0e0f10:a1b2c3d4e5f6g7h8i9j0k1l2:...`

## Key Versioning Architecture
- `ENCRYPTION_KEY_PRIMARY`: The active key version used for newly encrypted data (e.g. `v2`).
- `ENCRYPTION_KEY_LEGACY`: A dictionary or fallback mapping of retired keys (e.g. `v1`) kept during migration.
- Decryption parses the version prefix from the ciphertext, selects the corresponding key, and decrypts.

## Rotation Runbook (Zero Downtime)
1. **Provision New Key**: Generate a new 256-bit AES master key in KMS or environment secret (`ENCRYPTION_KEY_V2`).
2. **Deploy Dual-Key Configuration**:
   - Set `ENCRYPTION_KEY_PRIMARY` = `ENCRYPTION_KEY_V2`
   - Set `ENCRYPTION_KEY_FALLBACK` = `ENCRYPTION_KEY_V1`
3. **Execute Re-encryption Migration Job**:
   - Run the background batch migration:
     ```bash
     python -m apps.api-py.src.scripts.rotate_keys --from v1 --to v2
     ```
   - For each encrypted record:
     1. Decrypt using key `v1`.
     2. Re-encrypt using key `v2`.
     3. Save updated ciphertext record.
4. **Verify & Deprecate**:
   - Query DB to verify 0 records with prefix `v1:`.
   - Remove `ENCRYPTION_KEY_FALLBACK` from secret manager and redeploy.
