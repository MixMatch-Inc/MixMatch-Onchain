# Web Auth Surface — Sign-In Setup & Troubleshooting

## Overview

The web authentication surface handles credential-based sign-in via a Next.js frontend and an Express API backend. The flow follows a shared contract defined in `packages/types/src/auth.ts` and is designed to be extended for wallet-aware identity without premature coupling.

## Contracts & Routes

| Contract | Location |
|---|---|
| Login types (LoginRequest, LoginResponseData, CredentialErrorCode) | `packages/types/src/auth.ts` |
| API envelope types (ApiSuccess, ApiError, ApiEnvelope) | `packages/types/src/auth.ts` |

### API Endpoint

```
POST /api/v1/auth/login
```

- **Body**: `{ email: string, password: string }`
- **Success (200)**: `{ success: true, data: { token, user, session } }`
- **Error (401)**: `{ success: false, code: "AUTH_INVALID_CREDENTIALS", message: "Invalid email or password" }`
- **Error (422)**: `{ success: false, code: "VALIDATION_INVALID_INPUT", message: "Validation failed for body" }`

## Environment Values

| Variable | Default | Required |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001/api/v1` | No |
| `API_PORT` (API) | `3001` | No |

## Running the Flow

### Prerequisites

1.  API server running on port 3001:
    ```bash
    cd apps/api
    pnpm dev
    ```
2.  Web dev server running on port 3000:
    ```bash
    cd apps/web
    pnpm dev
    ```

### Exercise the Flow

1.  Navigate to `http://localhost:3000/signup`
2.  Create an account with email, password, and role
3.  Navigate to `http://localhost:3000/login`
4.  Sign in with the credentials from step 2
5.  On success you are redirected to `/` with the session persisted in localStorage

## Key Files

| File | Purpose |
|---|---|
| `apps/web/app/login/page.tsx` | Login page UI with form, loading, error states |
| `apps/web/app/hooks/useLogin.ts` | Login hook for credential submission and redirect |
| `apps/web/auth/auth-client.ts` | Auth API client (signup + login) |
| `apps/web/auth/auth-store.ts` | Zustand store for auth state |
| `apps/web/auth/auth-storage.ts` | localStorage persistence for session |
| `apps/api/src/domains/identity/login.handler.ts` | API login request handler |
| `apps/api/src/domains/identity/login.service.ts` | Credential validation & session issuance |
| `apps/api/src/domains/identity/login.validation.ts` | Zod schema for login payload |
| `apps/api/src/domains/identity/login.service.test.ts` | Regression tests |

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `401` on login | Wrong email or password | Verify credentials or re-register |
| `422` on login | Missing or invalid fields | Ensure email format and non-empty password |
| `CORS` error in browser | API not running or wrong port | Start API on port 3001 or update `NEXT_PUBLIC_API_URL` |
| `Cannot fetch` | API server not running | Start API: `cd apps/api && pnpm dev` |
| Session not persisted | localStorage cleared or blocked | Check browser storage settings |

## Open Questions & Trade-offs

- **Token storage**: Currently stored in localStorage. A production version should use httpOnly cookies for XSS protection.
- **Token refresh**: No refresh token rotation is implemented. Sessions are valid for 7 days via JWT expiry.
- **Wallet-aware identity**: The `LoginRequest` / `AuthResponse` contracts are designed so that a wallet address field can be added without breaking existing credential auth.
