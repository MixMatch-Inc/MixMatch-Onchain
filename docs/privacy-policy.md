# MixMatch Privacy Policy

> **Status:** Draft – pending legal review before publication (issue #1492).

## 1. Data We Collect

| Category | Examples | Retention |
|---|---|---|
| Account | email, display name, hashed password | Until erasure requested |
| Listening history | Spotify track IDs, play timestamps | 24 months rolling |
| On-chain | Stellar account IDs, transaction hashes | Permanent (public ledger) |
| OAuth tokens | Spotify `access_token` / `refresh_token` | Encrypted at rest (AES-256-GCM); rotated on re-auth |
| Analytics | Anonymised session events in ClickHouse | 12 months |

## 2. Data Export (`GET /users/me/export`)

Users may request a full machine-readable export of their account data. The
endpoint streams a ZIP archive containing:

- Profile JSON (excluding password hash)
- Listening history CSV
- Taste profile snapshot JSON
- Payment and escrow history JSON (on-chain references only)

## 3. Account Erasure (`DELETE /users/me`)

1. Soft-delete the user row (name/email replaced with tombstone).
2. Purge listening history from the relational DB.
3. Queue anonymisation of ClickHouse rows (async, SLA 30 days).
4. Custodial Vault key: schedule destruction after a 7-day grace period.
5. On-chain records (Stellar) are immutable and cannot be deleted; the
   association between the account ID and a real identity is removed.

## 4. Consent

- Listening-history ingestion requires explicit opt-in at registration
  (`listening_history_consent: bool`).
- ToS acceptance is recorded with a timestamp (`tos_accepted_at: datetime`).
- Age gate: users must confirm they are ≥ 13 years old during sign-up.

## 5. OAuth Token Storage

`StreamingConnection.access_token` and `refresh_token` are stored with an
`enc:v1:aes-gcm:` prefix indicating AES-256-GCM encryption via the KMS
module. Plain-text tokens must never be persisted.

## 6. Contact

Privacy enquiries: privacy@mixmatch.app
