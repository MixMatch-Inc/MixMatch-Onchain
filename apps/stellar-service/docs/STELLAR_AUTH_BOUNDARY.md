# Stellar Service — Auth Boundary

## Overview

The Stellar service provides the auth-to-Stellar handoff: wallet challenge generation and session verification. Shared request/response types live in `@themixmatch/types`.

The API proxies these routes at `/api/v1/stellar/auth/*` using `STELLAR_SERVICE_URL`.

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
| `StellarAuthChallengeRequest/Response` | Challenge flow |
| `StellarAuthVerifyRequest/Response` | Verify flow |

## Environment

| Variable | Default |
|----------|---------|
| `STELLAR_SERVICE_PORT` | 3002 |
| `STELLAR_NETWORK_PASSPHRASE` | Testnet |
| `STELLAR_HORIZON_URL` | https://horizon-testnet.stellar.org |

## Extension points

- Challenge verify currently checks token format and key shape only
- On-chain signature validation is a follow-up milestone
- Wallet linking status flows through `SessionBootstrap.wallet` on login/register

## Verification

From this package, contributors can run:

```bash
pnpm test
```

The regression coverage lives in `src/index.test.ts` and focuses on one happy path and one failure path for `/api/v1/stellar/auth/verify`.

## Related docs

- [Session Lifecycle](../../docs/SESSION_LIFECYCLE.md)
- [Monorepo Auth Setup](../../docs/MONOREPO_AUTH_SETUP.md)
