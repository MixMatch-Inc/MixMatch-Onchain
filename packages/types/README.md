# Auth Contracts

This package defines the shared authentication contract used by the API, web, mobile, and Stellar-facing workspaces.
The contracts are exported from `@themixmatch/types` and implemented in `packages/types/src/auth.ts`, `packages/types/src/session.types.ts`, and `packages/types/src/auth-boundary.ts`.

For contributors working on the Authentication milestone, this package is the first place to look before changing route shapes or inventing new session logic in an app workspace.

## Contract Entry Points (AUTH-061)

All auth-related types and shared auth-boundary helpers are available from the main entry point:

```ts
import {
  SignupRequest,
  LoginRequest,
  AuthSession,
  ProtectedSession,
  ValidateSessionRequest,
  SessionRefreshRequest,
  SessionRefreshResponse,
  evaluateProtectedRouteGuard,
  continueSessionAfterRefresh,
  isSupportedStellarSessionToken,
} from "@themixmatch/types";
```

## Contributor orientation

Use this package when you need to:

- name a shared request/response payload
- preserve one session vocabulary across API, web, mobile, and Stellar workspaces
- define how the auth layer hands a session over to the Stellar boundary
- extend wallet bootstrap metadata without duplicating it per app

The current starter split is:

- `packages/types` defines contracts and tiny boundary helpers
- `apps/api` implements login, refresh, introspection, logout, and proxy routes
- `apps/stellar-service` implements handshake, challenge, and verify behavior

## Request Types

### SignupRequest

Request body for account creation:

```ts
interface SignupRequest {
  email: string;
  password: string;
  role: UserRole;
}
```

### LoginRequest

Request body for account authentication:

```ts
interface LoginRequest {
  email: string;
  password: string;
}
```

### ValidateSessionRequest

Request body for protected session validation:

```ts
interface ValidateSessionRequest {
  accessToken: string;
}
```

### SessionRefreshRequest

Request body for session token refresh:

```ts
interface SessionRefreshRequest {
  refreshToken: string;
}
```

## Response Types

### Shared response envelope

```ts
interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ApiError {
  success: false;
  code: string;
  message: string;
}

// `ApiEnvelope<T>` is a compatibility alias for `ApiSuccess<T> | ApiError`.
type ApiEnvelope<T> = ApiSuccess<T> | ApiError;
```

### Auth session payload

```ts
interface SignupResponseData {
  token: string;
  refreshToken: string;
  user: AuthUserPayload;
  session: SessionBootstrap;
}
```

Key expectations for contributors:

- `user.id` and `session.userId` should continue to describe the same owner
- `session.wallet` is the shared place for Stellar/network bootstrap metadata
- refresh flows should update tokens without dropping `user` or `session.wallet`

### ProtectedSession

Result of validating a stored session:

```ts
interface ProtectedSession {
  isValid: boolean;
  needsRefresh: boolean;
  userId?: string;
  role?: UserRole;
  expiresAt?: string;
  refreshToken?: string;
}
```

### SessionRefreshResponse

Response from token refresh:

```ts
interface SessionRefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}
```

## Shared auth-boundary helpers

These helpers exist so later MVP work does not invent separate route-guard or auth-to-Stellar vocabularies per workspace.

### `evaluateProtectedRouteGuard`

Returns the shared `ProtectedRouteGuard` result for a stored session.
This keeps protected-route checks aligned across app surfaces.

### `continueSessionAfterRefresh`

Applies a `SessionRefreshResponse` to a stored `AuthSession` while preserving
user ownership and wallet bootstrap metadata.

### `isSupportedStellarSessionToken`

Documents the current auth-to-Stellar token handoff accepted by the starter:
local development tokens (`local.*`) and JWT-shaped tokens (`eyJ...`).

This is intentionally a starter-level seam. Tightening it later should happen here first so `apps/api` and `apps/stellar-service` stay aligned.

## Routes and env values this package connects

This package does not own runtime env parsing, but these contracts are consumed by the main Authentication-milestone routes and env values:

| Area | Examples |
|------|----------|
| API routes | `/api/v1/auth/login`, `/api/v1/auth/refresh`, `/api/v1/auth/introspect`, `/api/v1/stellar/auth/verify` |
| Stellar routes | `/handshake`, `/api/v1/stellar/auth/challenge`, `/api/v1/stellar/auth/verify` |
| API env | `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `STELLAR_SERVICE_URL` |
| Stellar env | `STELLAR_SERVICE_PORT`, `STELLAR_NETWORK_PASSPHRASE`, `STELLAR_HORIZON_URL` |

## Open seams and tradeoffs

- Shared helpers describe the current starter boundary; they are not a custody layer.
- `isSupportedStellarSessionToken()` is a format gate today, not a signature-verification system.
- `SessionBootstrap.wallet` is the intended place for wallet bootstrap metadata until a later identity-linking milestone refines it.
- If a new auth behavior spans workspaces, add or adjust the shared contract here before documenting workspace-local behavior.

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | /api/v1/auth/register | Create account |
| POST | /api/v1/auth/login | Authenticate |
| POST | /api/v1/auth/validate | Check session validity (AUTH-061) |
| POST | /api/v1/auth/refresh | Rotate refresh token |
| GET | /api/v1/auth/introspect | Validate access token (protected) |
