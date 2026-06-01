# Expo (Mobile) Auth Setup & Troubleshooting

## Overview

The mobile app mirrors the web session seam: introspect on launch, refresh when needed, and shared `ProtectedRouteGuard` evaluation.

See [Session Lifecycle](../../../docs/SESSION_LIFECYCLE.md) for the full lifecycle guide.

## Auth contracts

| Contract | Source |
|----------|--------|
| `AuthSession`, refresh/introspect/logout types | `@themixmatch/types` |
| `ProtectedRouteGuard` | `@themixmatch/types` (session.types.ts) |
| `SessionContinuityOutcome` | `@themixmatch/types` |

## Routes

| Path | Screen | Auth required |
|------|--------|---------------|
| `/` | HomeScreen | No (shows session state) |
| `/login` | LoginScreen | No |
| `/signup` | SignupScreen | No |

## Environment

| Variable | Default | Notes |
|----------|---------|-------|
| `EXPO_PUBLIC_API_BASE_URL` | unset | Omit for local mock; set to `http://localhost:3001` for API |

## Key files

```
apps/mobile/src/auth/
├── authClient.ts           # register, login, refresh, introspect, logout
├── AuthProvider.tsx        # session continuity on launch
├── authStorage.ts          # expo-secure-store
├── sessionContinuity.ts    # shared seam (mirrors web)
```

## Exercise the flow

1. Start API: `cd apps/api && pnpm dev`
2. Start mobile: `cd apps/mobile && pnpm dev`
3. Sign in → session persisted in SecureStore
4. Relaunch app → session restored via introspect/refresh
5. Sign out → refresh token revoked, storage cleared

## Run tests

```bash
pnpm test
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Session not persisting | Verify SecureStore availability on device |
| Always local mock | Set `EXPO_PUBLIC_API_BASE_URL` |
| Signed out after 15m | Ensure refresh token stored; check API refresh endpoint |

## Open questions

- Protected stack navigator not yet enforced — home screen reflects session state
- Web SecureStore fallback not implemented — use device/simulator for session tests
