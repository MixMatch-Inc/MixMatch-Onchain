# Authentication

## Overview

The reset starter uses a contract-first authentication model.

Authentication logic lives in:

- apps/api
- packages/types

No legacy authentication systems are required.

## Shared Contracts

Signup DTOs:
- SignupRequest
- SignupResponse

Authentication DTOs:
- LoginRequest
- LoginResponse

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