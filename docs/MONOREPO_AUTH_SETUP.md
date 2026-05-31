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
| POST | `/api/v1/auth/refresh` | Refresh access token |
| GET | `/api/v1/auth/introspect` | Introspect access token |
| POST | `/api/v1/stellar/auth/challenge` | Generate Stellar challenge |
| POST | `/api/v1/stellar/auth/verify` | Verify session on Stellar boundary |

## Web Auth Files

```
apps/web/auth/
├── auth-client.ts      # HTTP client for register & login (zod-free)
├── auth-storage.ts     # localStorage persistence for AuthSession
├── auth-session.ts     # Session expiry check (24h TTL)
apps/web/app/
├── login/page.tsx      # Login form → auth-client → redirect
├── hooks/useLogin.ts   # Login hook with loading/error state
├── hooks/useSessionBootstrap.ts  # Boot session from storage
```

## Mobile Auth Files

```
apps/mobile/src/auth/
├── authClient.ts       # API client with remote + local fallback
├── AuthProvider.tsx    # React context: status, session, signIn, signOut
├── authStorage.ts       # expo-secure-store persistence
apps/mobile/app/
├── login.tsx           # Login screen with form
├── _layout.tsx         # Stack navigator with login route
```

## Stellar Auth Boundary

The Stellar service provides on-chain authentication awareness at `/api/v1/stellar/auth`:

- `POST /api/v1/stellar/auth/verify` — Verify a session against the Stellar network
- `POST /api/v1/stellar/auth/challenge` — Generate a Stellar challenge transaction for wallet signing

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
| Login returns 401 | Wrong credentials | Check password; verify user exists via register |
| "Invalid response payload" | API envelope mismatch | Ensure API returns `{ success: true, data: { token, user, session } }` |
| Session lost on refresh | Storage key mismatch | Check localStorage key = `mixmatch:auth-session` |
| Mobile login always succeeds | EXPO_PUBLIC_API_BASE_URL not set | The client falls back to local mock when no API URL is configured |
| Stellar verify fails | Session not registered on-chain | Ensure wallet has signed the Stellar challenge transaction |
| Stellar challenge fails | Invalid Stellar public key | Verify key format with Stellar SDK |

## PR Checklist

Before opening a PR touching auth:
- [ ] Shared types updated in `packages/types/src/auth.ts`
- [ ] API endpoint wired in `apps/api/src/app.ts`
- [ ] Auth client updated in relevant surface(s)
- [ ] Login page/screen created or updated
- [ ] Tests pass: `pnpm -r run typecheck`
- [ ] Stellar boundary contracts updated if on-chain auth required
