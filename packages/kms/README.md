# @mixmatch/kms

Thin client for HashiCorp Vault's transit secrets engine, used as the KMS backend for Stellar account signing keys — see `apps/api/src/modules/payments/README.md`'s "Wallet custody" section for the full rationale and setup.

`VaultTransitClient` never returns key material: every key is created with `exportable: false` / `allow_plaintext_backup: false`, so the only things it hands back are a public key (`getPublicKey`) and a signature over caller-supplied data (`sign`). Consumed by `@mixmatch/stellar`'s `VaultWallet`, which structurally satisfies its `RemoteSigner` interface — this package has no dependency on `@mixmatch/stellar` or vice versa.
