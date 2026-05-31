# Auth Contracts

This package defines the shared authentication contract used by the API, web, and mobile workspaces.
The contracts are exported from `@themixmatch/types` and implemented in `packages/types/src/auth.ts`.

## What to import

```ts
import type {
  SignupRequest,
  LoginRequest,
  SignupResponse,
  LoginResponse,
  AuthSession,
} from "@themixmatch/types";
```

## Core contract shape

- `SignupRequest`
  - `email: string`
  - `password: string`
  - `role: UserRole`

- `LoginRequest`
  - `email: string`
  - `password: string`

- `ApiResponse<T>`
  - `success: true` + `data: T`
  - or `success: false` + `message` + optional `code`

- `AuthResponse`
  - `token: string`
  - `user: AuthUserPayload`

- `SessionBootstrap`
  - `userId: string`
  - `role: UserRole`
  - `onboardingCompleted: boolean`
  - `issuedAt: string`

## Runtime routes

The API exposes these routes:
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`

Both routes return `ApiResponse<T>` to keep the contract consistent across web and mobile.

## Extension guidance

- Add new auth behavior by changing this contract and then updating API validation/handlers.
- Avoid app-local auth schemas; use `@themixmatch/types` across workspaces.
- If you add new auth fields, keep error response shape stable by reusing `ApiResponse<T>`.
