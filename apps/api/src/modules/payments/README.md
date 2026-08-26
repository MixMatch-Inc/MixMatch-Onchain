# Payments module

## Wallet custody

Every custodial Stellar account (`stellar_accounts` row) is signed one of two ways:

- **Vault-backed (`signingKeyId`)** — every account created while `VAULT_ADDR`/`VAULT_TOKEN` are configured. The account's ed25519 keypair lives entirely inside HashiCorp Vault's transit secrets engine, created with `exportable: false` / `allow_plaintext_backup: false` — the private key material never leaves Vault, not even transiently in this process. Signing a transaction means sending its hash to Vault and getting a signature back (`@mixmatch/kms`'s `VaultTransitClient`); this process only ever holds the account's *public* key.
- **Locally-encrypted secret (`encryptedSecretKey`), legacy** — every account created before this migration, or created now if Vault isn't configured (e.g. local dev without Vault installed). The Stellar secret key is encrypted at rest with AES-256-GCM under one shared `WALLET_ENCRYPTION_KEY` and decrypted into memory for the duration of a single signing operation (`wallet-encryption.ts`). Kept working indefinitely — never migrated automatically — but no longer used for new accounts.

`stellar_accounts` has exactly one of `signingKeyId` / `encryptedSecretKey` set per row; this is enforced at the application layer (`WalletResolver`), not as a DB constraint, since Drizzle doesn't have a portable XOR check across nullable columns.

[`wallet-resolver.ts`](./wallet-resolver.ts)'s `WalletResolver` is the single chokepoint every service (`PaymentsService`, `EscrowService`, `AnchorService`) goes through to get a signing `Wallet` for an account or for the platform's admin co-signer — no service constructs a `KeypairWallet`/`VaultWallet` directly. It dispatches on:

- `walletForAccount(account)` — `VaultWallet` if `signingKeyId` is set, else legacy `KeypairWallet`.
- `createAccountSigner()` — used only by `PaymentsService.getOrCreateStellarAccount` when provisioning a brand-new account. Creates a Vault transit key if Vault is configured, otherwise falls back to generating and encrypting a local keypair.
- `adminWallet()` — the platform's high-value-payment co-signer (see multisig, issue #860): a Vault key (`ADMIN_SIGNING_KEY_NAME`) if Vault is configured, otherwise the legacy `ADMIN_SIGNING_SECRET`.

### Why Vault/KMS over client-side non-custodial signing

This is a custodial wallet platform — the server has always held signing authority on the user's behalf (that's what made the pre-existing `WALLET_ENCRYPTION_KEY` design a real liability: one symmetric key, compromised once, decrypts every account's secret key, for every account, forever). Two ways to remove that single point of failure were considered:

1. **KMS/HSM-backed signing service (chosen)** — move signing keys out of this process into a dedicated key-management system (HashiCorp Vault's transit engine, backed by a real dev-mode server for this implementation and verified end-to-end against it). The server still initiates and requests every signature, but the signing key itself never exists in this process's memory, and Vault's own access control/audit logging governs who can invoke a signature — a compromise of the API process's memory or the `WALLET_ENCRYPTION_KEY` env var no longer yields every user's key material at once.
2. **Genuine non-custodial client-side signing** — the user's device holds the key and signs locally; the server never sees it at all. Rejected for this iteration: it's a materially different product (users must manage their own keys, install a wallet, handle backups/recovery themselves) and a much larger surface change across every payment flow (path payments, escrow, SEP-24 anchor auth, multisig) than a key-custody hardening pass. Worth revisiting as a future opt-in wallet-connect-style flow, but out of scope here.

Vault-Stellar signature compatibility was verified empirically against a real running Vault dev server before writing any application code: Vault's raw 32-byte ed25519 public key converts directly to a Stellar `G...` address (`StrKey.encodeEd25519PublicKey`), and Vault's raw 64-byte signature over a transaction's hash verifies directly as a Stellar signature (`Keypair.verify`) — no protocol-level translation needed. `@stellar/stellar-sdk`'s `Transaction.prototype.addSignature` is the mechanism used to attach that externally-produced signature; it self-validates against the wallet's public key before appending, so a corrupted or mismatched remote signature throws immediately rather than producing a silently-invalid transaction.

### Legacy accounts / migration scope

Existing accounts created before this change keep using `encryptedSecretKey` indefinitely — there is no automatic re-keying into Vault. Migrating a live account's signing authority into Vault would require either (a) a transaction moving funds to a fresh Vault-backed account, or (b) importing the existing secret key into Vault (which reintroduces the exact plaintext-exposure moment this change is meant to eliminate, only once instead of on every use) — both are product/ops decisions belonging to a separate change, not silently bundled into this one. This is an explicit, intentional scope boundary, not an oversight.

### Local Vault setup for development

```bash
vault server -dev -dev-root-token-id=root
export VAULT_ADDR=http://127.0.0.1:8200 VAULT_TOKEN=root
vault secrets enable transit
vault write -f transit/keys/platform-admin type=ed25519
vault read -field=public_key transit/keys/platform-admin  # for funding via Friendbot/manually
```

Then set `VAULT_ADDR`, `VAULT_TOKEN`, and `ADMIN_SIGNING_KEY_NAME=platform-admin` in `.env` (see the repo-root `.env.example`). Leaving `VAULT_ADDR` unset keeps the legacy encrypted-secret path active for every new account, unchanged from before this migration.
