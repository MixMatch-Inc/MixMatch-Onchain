# Web Auth Surface — Setup & Troubleshooting

## Overview

The web app uses shared auth contracts from `@themixmatch/types` and the same session continuity seam as mobile. Protected routes evaluate the shared `ProtectedRouteGuard` contract rather than ad-hoc checks.

For the four assigned issues, treat this page as the web-specific companion to `docs/SESSION_LIFECYCLE.md`: it keeps the route restore, expiry, and refresh story in one place for contributors.

See [Session Lifecycle](../../../docs/SESSION_LIFECYCLE.md) for the full lifecycle guide.

## Contracts & Routes

| Contract | Location |
|----------|----------|
| Session types | `packages/types/src/auth.ts` |
| Guard contract | `packages/types/src/session.types.ts` |
| Session continuity | `apps/web/auth/session-continuity.ts` |

### API endpoints used by web client

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/auth/register` | Registration |
| POST | `/api/v1/auth/login` | Sign in |
| POST | `/api/v1/auth/refresh` | Rotate token pair |
| GET | `/api/v1/auth/introspect` | Validate access token |
| POST | `/api/v1/auth/logout` | Revoke refresh token |

## Environment

| Variable | Default | Required |
|----------|---------|----------|
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:3001` | No |

## Key files

| File | Purpose |
|------|---------|
| `auth/auth-client.ts` | HTTP client (register, login, refresh, introspect, logout) |
| `auth/auth-storage.ts` | localStorage persistence |
| `auth/auth-context.tsx` | AuthProvider with session continuity bootstrap |
| `auth/session-continuity.ts` | `ensureSessionContinuity`, `evaluateProtectedRouteGuard` |
| `app/dashboard/page.tsx` | Protected route example |

## Exercise the flow

1. Start API: `cd apps/api && pnpm dev`
2. Start web: `cd apps/web && pnpm dev`
3. Register at `/signup`, sign in at `/login`
4. Visit `/dashboard` — requires active session
5. Sign out — clears storage and revokes refresh token

## Run tests

```bash
pnpm test
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Redirect to login after reload | Check refresh token in stored session; verify API `/auth/refresh` |
| `Cannot fetch` | Start API on port 3001 |
| Dashboard stuck on loading | Wait for `isBootstrapping` to finish in AuthProvider |

## Open questions

- Token storage is localStorage — production should use httpOnly cookies
- No Next.js middleware yet — guards are client-side via shared contract
- The current starter documents the contract shape before adding new runtime orchestration, which keeps follow-up PRs small and focused
