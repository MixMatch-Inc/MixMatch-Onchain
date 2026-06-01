# Auth Contracts

This package defines the shared authentication contract used by the API, web, and mobile workspaces.
The contracts are exported from `@themixmatch/types` and implemented in `packages/types/src/auth.ts`.

## Contract Entry Points (AUTH-061)

All auth-related types are available from the main entry point:

```ts
import { 
  SignupRequest, 
  LoginRequest, 
  AuthSession, 
  ProtectedSession,
  ValidateSessionRequest,
  SessionRefreshRequest,
  SessionRefreshResponse,
} from "@themixmatch/types";
```

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

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | /api/v1/auth/register | Create account |
| POST | /api/v1/auth/login | Authenticate |
| POST | /api/v1/auth/validate | Check session validity (AUTH-061) |
| POST | /api/v1/auth/refresh | Rotate refresh token |
| GET | /api/v1/auth/introspect | Validate access token (protected) |
