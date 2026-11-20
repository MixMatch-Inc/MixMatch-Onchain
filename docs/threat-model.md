# MixMatch Threat Model and Custody ADR

> **Status:** Draft – awaiting maintainer sign-off (issue #1493).

## STRIDE Analysis – Key Trust Boundaries

### 1. Custodial Key Material (Vault Transit)

| Threat | Category | Mitigation |
|---|---|---|
| Vault token leaked via env var | Information Disclosure | Use AppRole / Kubernetes auth; never store root tokens |
| Vault unsealed by single operator | Elevation of Privilege | Shamir secret sharing (≥ 3-of-5); DR replicas |
| Transit key exported | Information Disclosure | `exportable=false` on key creation; audit device enabled |
| Break-glass key use not logged | Repudiation | Mandatory `audit_log` write before any break-glass action |
| Legacy `WALLET_ENCRYPTION_KEY` migration | Tampering | Re-encrypt all blobs under Vault Transit before retiring the env var |

### 2. Custodial vs Non-Custodial Decision

**Decision:** MixMatch operates a **custodial** model for onboarding simplicity.

- User private keys are generated server-side and stored in Vault Transit.
- Key recovery requires identity verification (email OTP + TOTP if enabled).
- Break-glass procedure: two senior engineers must co-authorise via separate
  Vault tokens; every access writes to `audit_log` with `action=KEY_USE`.

### 3. Escrow Trust Boundary

- Escrow contract calls go through the KMS package (packages/kms).
- Anchor SEP-10/24 interactions are authenticated; the anchor server is
  treated as a third-party trust boundary.

### 4. Vault Hardening Checklist

- [ ] Enable TLS on the Vault listener (`tls_cert_file` / `tls_key_file`)
- [ ] Configure AppRole auth (`auth/approle`) with `secret_id_ttl` ≤ 1 h
- [ ] Enable the `file` or `syslog` audit device before unsealing in production
- [ ] Set `default_lease_ttl = 1h` and `max_lease_ttl = 24h`
- [ ] Deploy a Vault DR replica and document the promote procedure
- [ ] Run `vault operator unseal` from at least 3 distinct key holders

### 5. JWT / Session Threat Surface

See `apps/api-py/src/modules/auth/session_manager.py` for the refresh-token
rotation design. Tokens in `localStorage` / AsyncStorage are replaced by
httpOnly cookies (web) and SecureStore (mobile) in a follow-up.
