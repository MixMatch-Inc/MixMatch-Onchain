# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| `main` / `develop` | ✅ |
| Older tags | ❌ |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Report vulnerabilities privately via GitHub's built-in security advisory
feature: **Security → Report a vulnerability** on the repository page.

Alternatively, email **security@mixmatch.app** with:

1. A clear description of the vulnerability.
2. Steps to reproduce or proof-of-concept code.
3. The impact and affected components.

## Response SLAs

| Severity | Acknowledgement | Patch Target |
|---|---|---|
| Critical (CVSS ≥ 9) | 24 h | 7 days |
| High (CVSS 7–8.9) | 48 h | 14 days |
| Medium (CVSS 4–6.9) | 5 days | 30 days |
| Low (CVSS < 4) | 10 days | Next release |

## Safe Harbour

MixMatch will not pursue legal action against researchers who:

- Report through the channels above.
- Do not access, modify or destroy user data.
- Do not disclose the vulnerability publicly before a patch is released.

## Scope

**In scope:** `apps/api-py`, `apps/api`, `packages/kms`, `packages/stellar`,
custodial wallet flows, Vault integration, Stellar/Soroban on-chain interactions.

**Out of scope:** Third-party services (Spotify, Stellar Foundation infrastructure),
social-engineering attacks targeting employees.

## Known Dev Secrets Allowlist

The following values in `.env.example` and `docker-compose.yml` are
intentional placeholders and **not** real secrets:

- `dev_insecure_jwt_secret_min_32_characters_long`
- `0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef`
- `test-vault-token`
