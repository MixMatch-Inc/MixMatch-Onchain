# Authentication

## Overview

This starter implements the first authentication slice with a contract-first API surface and no legacy auth plumbing.
The auth runtime lives in `apps/api`, and the shared auth contract lives in `packages/types`.

## What matters for contributors

- Shared auth contracts are exported from `@themixmatch/types`.
- Runtime auth routes are mounted in `apps/api/src/app.ts`.
- API request validation lives in `apps/api/src/domains/identity/auth.validation.ts`.
- Auth token generation is handled in `apps/api/src/services/jwt.service.ts`.
- The current user store is an in-memory repository in `apps/api/src/repositories/user.repository.ts`.

## Shared contracts

Source:
- `packages/types/src/auth.ts`

Core request/response types:
- `SignupRequest` — `{ email, password, role }`
- `LoginRequest` — `{ email, password }`
- `AuthResponse` — `{ token, user }`
- `SessionBootstrap` — `{ userId, role, onboardingCompleted, issuedAt }`
- `ApiResponse<T>` — shared response envelope for success or error data

Response shapes:
- `SignupResponse = ApiResponse<SignupResponseData>`
- `LoginResponse = ApiResponse<LoginResponseData>`
- `AuthSession = SignupResponseData`

## API routes

- `POST /api/v1/auth/register`
  - Accepts `SignupRequest`
  - Validates payload with `registerSchema`
  - Creates a new user via `apps/api/src/domains/identity/signup.service.ts`
  - Returns `ApiSuccess` with `{ token, user, session }`

- `POST /api/v1/auth/login`
  - Accepts `LoginRequest`
  - Validates payload with `loginSchema`
  - Authenticates credentials in `apps/api/src/domains/identity/login.service.ts`
  - Returns `ApiSuccess` with `{ token, user, session }`

## Error handling

Error responses use the shared envelope:
- `success: false`
- `message: string`
- optional `code: string`

Common auth errors:
- `AUTH_EMAIL_EXISTS` for duplicate registration
- `AUTH_INVALID_CREDENTIALS` for bad login attempts
- `VALIDATION_INVALID_INPUT` for malformed requests

## Environment configuration

The API runtime supports:
- `JWT_SECRET` — JWT signing secret used by `apps/api/src/services/jwt.service.ts`

If `JWT_SECRET` is not set in development, the starter uses a fallback value:
`dev-secret-key-change-in-production`.

## How to exercise this slice

1. Run the API locally: `pnpm --filter @themixmatch/api dev`.
2. Call `POST /api/v1/auth/register` with a valid `SignupRequest`.
3. Call `POST /api/v1/auth/login` with the same credentials.
4. Observe the returned `token`, `user`, and `session` bootstrap payload.

## How to extend this slice

1. Update the contract in `packages/types/src/auth.ts`.
2. Add or revise validation in `apps/api/src/domains/identity/auth.validation.ts`.
3. Add API handlers in `apps/api/src/domains/identity` and wire them in `apps/api/src/app.ts`.
4. Keep frontend/mobile workspaces aligned by importing types from `@themixmatch/types`.

## Next seams and open questions

- The starter does not yet include refresh tokens, logout, or session introspection.
- The current user repository is in-memory; future work should replace it with persistent storage.
- Session bootstrapping is currently a simple payload; later milestones should separate session state from auth token claims.
- The API does not yet expose protected routes or middleware for verifying auth tokens.
