# Web Auth Shell

## Purpose

The web auth shell is the client-side authentication boundary for the Next.js web app. It provides a consistent auth wrapper, loading state management, and integrates `AuthProvider` with the component tree.

## Components

### AuthShell

The `AuthShell` component wraps authenticated page content and handles the auth loading state:

```tsx
<AuthShell fallback={<LoadingSpinner />}>
  <AuthenticatedContent />
</AuthShell>
```

**Props:**

| Prop       | Type        | Default  | Description                              |
| ---------- | ----------- | -------- | ---------------------------------------- |
| `children` | `ReactNode` | Required | Content to render when auth is loaded    |
| `fallback` | `ReactNode` | Loading text | Content to render while auth is loading |

### AuthProvider

Wraps the entire app in `RootLayout` to provide auth context globally:

```tsx
// apps/web/src/app/layout.tsx
<AuthProvider>
  {children}
</AuthProvider>
```

### useAuth Hook

Available to any component within `AuthProvider`:

```ts
const { user, accessToken, isLoading, setAuth, logout } = useAuth();
```

## Integration Points

### Root Layout (`app/layout.tsx`)
- `AuthProvider` wraps the entire app
- No page-level configuration needed

### Login Page (`app/login/page.tsx`)
- Uses `loginSchema` for client-side validation
- Calls `loginUser()` API client
- Stores auth via `setAuth()`

### Signup Page (`app/signup/page.tsx`)
- Uses `registerSchema` for client-side validation
- Calls `registerUser()` API client
- Stores auth via `setAuth()`

## State Machine

```
INITIAL -> LOADING (reading localStorage)
LOADING -> AUTHENTICATED (valid token found)
LOADING -> UNAUTHENTICATED (no token or invalid)
AUTHENTICATED -> UNAUTHENTICATED (logout / token expiry)
UNAUTHENTICATED -> AUTHENTICATED (login / register success)
```

## Edge Cases

| Scenario | Behaviour |
|---|---|
| localStorage corrupted | Removed silently, user treated as unauthenticated |
| Multiple rapid login calls | Last response wins (React state overwrite) |
| AuthShell rendered before AuthProvider | `useAuth` throws clear error message |
| isLoading never resolves | Fallback UI shown indefinitely (rare) |
