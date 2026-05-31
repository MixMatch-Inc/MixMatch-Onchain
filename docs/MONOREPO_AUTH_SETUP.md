# Monorepo Auth Stack — Setup & Troubleshooting

## Overview

The MixMatch Onchain monorepo implements a three-tier authentication system:

1. **API service** (`apps/api`) — Express server handling credential validation and session issuance
2. **Web app** (`apps/web`) — Next.js frontend with login/register flows
3. **Mobile app** (`apps/mobile`) — Expo React Native frontend
4. **Stellar service** (`apps/stellar-service`) — Stellar network boundary for on-chain operations

## Shared Contracts (`packages/types`)

| Type | File | Used By |
|------|------|---------|
| `LoginRequest` | `packages/types/src/auth.ts` | API, Web, Mobile, Stellar |
| `LoginResponseData` | `packages/types/src/auth.ts` | API, Web, Mobile, Stellar |
| `CredentialErrorCode` | `packages/types/src/auth.ts` | API, Web, Mobile |
| `CredentialErrorContract` | `packages/types/src/auth.ts` | Stellar boundary |
| `AuthSession` | `packages/types/src/auth.ts` | Web, Mobile |
| `ApiEnvelope<T>` | `packages/types/src/auth.ts` | API, Web, Mobile |
| `StellarAuthRequest` | `packages/types/src/auth.ts` | API, Stellar |
| `StellarSessionContract` | `packages/types/src/auth.ts` | Stellar boundary |

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Create account |
| POST | `/api/v1/auth/login` | Sign in → token + session |
| POST | `/api/v1/stellar/auth/challenge` | Generate Stellar challenge |
| POST | `/api/v1/stellar/auth/verify` | Verify session on Stellar boundary |

## Running the Full Stack

```bash
# Terminal 1: API
cd apps/api && pnpm dev

# Terminal 2: Web (optional)
cd apps/web && pnpm dev

# Terminal 3: Mobile (optional)
cd apps/mobile && pnpm dev

# Terminal 4: Stellar service
cd apps/stellar-service && pnpm dev
```

## Environment Variables

| Variable | Required | Default | App |
|----------|----------|---------|-----|
| `PORT` | No | 3001 | API |
| `NEXT_PUBLIC_API_BASE_URL` | No | http://localhost:3001 | Web |
| `EXPO_PUBLIC_API_BASE_URL` | No | (local mock fallback) | Mobile |
| `STELLAR_SERVICE_PORT` | No | 3002 | Stellar |
| `STELLAR_NETWORK_PASSPHRASE` | No | Testnet | Stellar |
| `STELLAR_HORIZON_URL` | No | https://horizon-testnet.stellar.org | Stellar |

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Login returns 401 | Wrong credentials | Check password; verify user via register |
| Mobile login always succeeds | No API URL configured | Set EXPO_PUBLIC_API_BASE_URL for real API |
| Stellar verify fails | Invalid session token | Ensure session is obtained via login first |
| Stellar challenge fails | Invalid Stellar public key | Verify key format with Stellar SDK |
