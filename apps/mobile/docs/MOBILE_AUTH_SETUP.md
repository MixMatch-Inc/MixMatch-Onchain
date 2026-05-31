# Expo (Mobile) Auth Setup & Troubleshooting

## Overview

The Expo mobile app (`apps/mobile`) provides a cross-platform authentication surface for iOS and Android. It supports registration, login, session persistence via `expo-secure-store`, and automatic session restoration on launch.

## Auth Contracts

| Contract               | Source                                      | Description                              |
|------------------------|---------------------------------------------|------------------------------------------|
| `SignupRequest`        | `@themixmatch/types` (AuthUserPayload)       | Registration payload (email, password, role) |
| `LoginRequest`         | `@themixmatch/types`                        | Login payload (email, password)           |
| `AuthSession`          | `@themixmatch/types`                        | Stored session (token, user, session meta) |
| `CredentialErrorCode`  | `@themixmatch/types`                        | Error codes: INVALID_CREDENTIALS, ACCOUNT_NOT_FOUND, ACCOUNT_LOCKED |
| `AuthClientError`      | `src/auth/authClient.ts`                    | Client-side error wrapper with kind, status, code |

## Routes

| Path       | Screen       | Auth required | Description                     |
|------------|--------------|---------------|---------------------------------|
| `/`        | HomeScreen   | No            | Entry point, session check      |
| `/register`| RegisterScreen | No           | Role selection → `/signup`      |
| `/signup`  | SignupScreen  | No           | Email/password registration     |
| `/login`   | LoginScreen   | No           | Email/password sign-in          |

## Dependencies

- `expo-secure-store` — encrypted key-value storage for session tokens
- `expo-router` — file-based navigation

## Environment

| Variable                    | Required | Default               | Description                           |
|-----------------------------|----------|-----------------------|---------------------------------------|
| `EXPO_PUBLIC_API_BASE_URL`  | No       | `http://localhost:3001`| Backend API root (omit for local mock) |

When `EXPO_PUBLIC_API_BASE_URL` is **not** set, the auth client uses a local in-memory fallback that generates sessions without a server.

## Running the Flow

```bash
# Terminal 1: start the API server
cd apps/api && pnpm dev     # → http://localhost:3001

# Terminal 2: start Expo
cd apps/mobile && pnpm dev  # → Expo Go / simulator
```

1. Open the app → see HomeScreen
2. Tap **Sign in** → LoginScreen
3. Enter email + password → tap **Sign in**
4. On success → redirected to HomeScreen (signed-in state)
5. Tap **Sign out** → session cleared

## Key Files

```
apps/mobile/
├── app/
│   ├── _layout.tsx         # Root layout: AuthProvider + Stack navigator
│   ├── index.tsx           # HomeScreen: session-aware entry point
│   ├── login.tsx           # LoginScreen: email/password form
│   ├── register.tsx        # RegisterScreen: role selection
│   └── signup.tsx          # SignupScreen: registration form
├── src/auth/
│   ├── AuthProvider.tsx    # React context for auth state & methods
│   ├── authClient.ts       # API client with remote + local fallback
│   └── authStorage.ts      # Session persistence via expo-secure-store
└── docs/
    └── MOBILE_AUTH_SETUP.md  # This file
```

## Troubleshooting

### Session not persisting between launches
- Ensure `expo-secure-store` is available on the device/simulator
- Web browsers don't support SecureStore — use `authStorage.ts` with AsyncStorage fallback

### "Sign in" button does nothing
- Check that `process.env.EXPO_PUBLIC_API_BASE_URL` is set correctly when using a real API
- If not set, the local fallback always succeeds — no server needed

### Navigation broken after login
- Verify `router.replace("/")` fires (Expo Router issue: use `replace` not `push` to avoid back-stack issues)
- Ensure `signIn()` resolves before calling `router.replace()`

### AuthClientError: "Invalid response payload"
- The API returned a successful envelope (`{ success: true }`) but the data shape didn't match `SignupResponseData` / `LoginResponseData`
- Verify the backend returns `{ success: true, data: { token, user, session } }`

### AuthClientError: "Unknown response envelope"
- The API returned a non-standard JSON structure
- Check that the response is wrapped in `{ success: true/false, data/code/message }` format
