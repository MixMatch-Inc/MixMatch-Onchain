# Auth Contracts

This package defines the shared authentication contract used by the API, web, and mobile workspaces.
The contracts are exported from `@themixmatch/types` and implemented in `packages/types/src/auth.ts`.

## SignupRequest

Request body for account creation:

```ts
interface SignupRequest {
  email: string;
  password: string;
  role: UserRole;
}
```

## LoginRequest

Request body for account authentication:

```ts
interface LoginRequest {
  email: string;
  password: string;
}
```

## Shared response envelope

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
```

## Auth session payload

```ts
interface SignupResponseData {
  token: string;
  user: AuthUserPayload;
  session: SessionBootstrap;
}
```
