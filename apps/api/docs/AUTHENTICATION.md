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

Signup DTOs:
- SignupRequest
- SignupResponse

Response shapes:
- `SignupResponse = ApiResponse<SignupResponseData>`
- `LoginResponse = ApiResponse<LoginResponseData>`
- `AuthSession = SignupResponseData`

Session DTOs:
- AuthSession
- SessionBootstrap

Envelope DTOs:
- ApiSuccess<T>
- ApiError

Location:
packages/types/src/auth.ts

## API routes

- POST /api/v1/auth/register — create a new account, return a token, user payload, and session bootstrap.
- POST /api/v1/auth/login — authenticate an existing account and return the same session-shaped payload.

## Expected response shape

All successful responses use the shared envelope:

```json
{
  "success": true,
  "data": {
    "token": "...",
    "user": { /* AuthUserPayload */ },
    "session": { /* SessionBootstrap */ }
  }
}
```

Errors use the shared error envelope:

```json
{
  "success": false,
  "code": "AUTH_INVALID_CREDENTIALS",
  "message": "Invalid email or password"
}
```
