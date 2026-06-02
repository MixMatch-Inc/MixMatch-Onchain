# Stellar Service — Auth Boundary

## Overview

The Stellar service provides the auth-to-Stellar handoff: wallet challenge generation and session verification. Shared request/response types live in `@themixmatch/types`.

The API proxies these routes at `/api/v1/stellar/auth/*` using `STELLAR_SERVICE_URL`.

For contributors, the boundary is intentionally narrow in this milestone:

- `apps/api` owns login, refresh, introspection, logout, and session ownership rules
- `apps/stellar-service` owns challenge generation, wallet/network metadata, and verify input checks
- `packages/types` owns the shared contracts and boundary helpers
- No custody, signing-key management, or on-chain signature proof is implemented here yet

## Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/handshake` | Network + wallet metadata |
| POST | `/api/v1/stellar/auth/challenge` | Generate challenge transaction XDR |
| POST | `/api/v1/stellar/auth/verify` | Verify session token + Stellar public key |

## Shared contracts

The boundary helpers live in `@themixmatch/types` so auth and wallet-facing workspaces reuse the same contract vocabulary:

- `evaluateProtectedRouteGuard`
- `continueSessionAfterRefresh`
- `isSupportedStellarSessionToken`

| Type | Purpose |
|------|---------|
| `StellarServiceHandshake` | Handshake metadata |
| `WalletBootstrap` | Wallet metadata passed back through API auth responses |
| `StellarAuthChallengeRequest/Response` | Challenge flow |
| `StellarAuthVerifyRequest/Response` | Verify flow |

### Current verify contract expectations

Contributors extending `/api/v1/stellar/auth/verify` should preserve these starter expectations unless a later milestone intentionally changes them:

1. The incoming `sessionToken` represents an already-authenticated session from the auth layer
2. The current starter only checks whether the token matches `isSupportedStellarSessionToken()`
3. The Stellar public key must parse as a valid Stellar account id
4. Success returns `verified`, `stellarAccountId`, and `linkedAt`
5. Failure should remain machine-readable (`AUTH_INVALID_SESSION`, `INVALID_STELLAR_KEY`, etc.) so app workspaces can respond predictably

## Environment

| Variable | Default | Notes |
|----------|---------|-------|
| `STELLAR_SERVICE_PORT` | 3002 | Local listen port |
| `STELLAR_NETWORK_PASSPHRASE` | Testnet | Returned by `/handshake` and challenge responses |
| `STELLAR_HORIZON_URL` | https://horizon-testnet.stellar.org | Returned by `/handshake` and consumed by wallet bootstrap |
| `STELLAR_SIGNING_KEY` | unset | Reserved seam for future signed challenge flows; not required in the current starter |

## Extension points

- Challenge/verify currently check token format and key shape only
- On-chain signature validation is a follow-up milestone
- Wallet linking status flows through `SessionBootstrap.wallet` on login/register
- If you tighten session-token rules here, also update `isSupportedStellarSessionToken()` in `packages/types`
- If you change handshake payload shape, update both `StellarServiceHandshake` and the API-side wallet bootstrap mapping

## How contributors should exercise or extend this seam

1. Start the API and Stellar service from the reset monorepo
2. Fetch `GET /api/v1/auth/handshake` to confirm API ↔ Stellar connectivity
3. Exercise `POST /api/v1/stellar/auth/challenge` with a plausible Stellar public key
4. Exercise `POST /api/v1/stellar/auth/verify` once with a supported session token and once with an unsupported token
5. If you extend the behavior, update the shared type first in `packages/types`, then update runtime code, then update this doc and `apps/api/docs/AUTHENTICATION.md`

## Verification

The regression coverage lives in `src/index.test.ts` and focuses on one happy path and one failure path for `/api/v1/stellar/auth/verify`.

## Related docs

- [Session Lifecycle](../../docs/SESSION_LIFECYCLE.md)
- [API authentication](../../apps/api/docs/AUTHENTICATION.md)
- [Local auth setup](../../apps/api/docs/LOCAL_AUTH_SETUP.md)
