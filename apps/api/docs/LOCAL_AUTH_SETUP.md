# Local Authentication Setup — Full Stack Verification and Recovery

This guide is for contributors working on the reset starter auth slice. It covers the current auth/session seam between `apps/api`, `apps/stellar-service`, and the shared contracts in `packages/types`.

## What matters in this slice

### Shared contracts to know

- `AuthSession`
- `SessionBootstrap`
- `ProtectedSession`
- `SessionRefreshResponse`
- `SessionContinuityOutcome`
- `ProtectedRouteGuard`
- `StellarServiceHandshake`
- `StellarAuthChallengeRequest/Response`
- `StellarAuthVerifyRequest/Response`
- `evaluateProtectedRouteGuard()`
- `continueSessionAfterRefresh()`
- `isSupportedStellarSessionToken()`

### Routes contributors usually touch

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/introspect`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/handshake`
- `POST /api/v1/stellar/auth/challenge`
- `POST /api/v1/stellar/auth/verify`

## Quick start

### 1. Install dependencies

```bash
cd MixMatch-Onchain
pnpm install
```

### 2. Start all services (in separate terminals)

**Terminal 1 — API service:**
```bash
cd apps/api
pnpm dev
# Listen on http://localhost:3001
```

**Terminal 2 — Web client:**
```bash
cd apps/web
pnpm dev
# Listen on http://localhost:3000
```

**Terminal 3 — Mobile client (optional):**
```bash
cd apps/mobile
pnpm dev
# Expo CLI will prompt for device/simulator
```

**Terminal 4 — Stellar service (optional, for wallet auth):**
```bash
cd apps/stellar-service
pnpm dev
# Listen on http://localhost:3002
```

## Required environment variables

### API (`apps/api/.env.local`)

```bash
# JWT signing secret — use a random string in production
JWT_SECRET=dev-secret-key-change-in-production

# Stellar service URL for challenge/verify proxying
STELLAR_SERVICE_URL=http://localhost:3002

# Access token lifetime (used by jwt.service.ts)
JWT_EXPIRES_IN=15m

# API listen port
PORT=3001

# Database connection (optional — in-memory store is default)
DATABASE_URL=postgresql://user:password@localhost:5432/mixmatch
```

### Web (`apps/web/.env.local`)

```bash
# API base URL for auth client
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

### Mobile (`apps/mobile/.env.local`)

```bash
# API base URL for auth client
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001
```

### Stellar service (`apps/stellar-service/.env.local`)

```bash
# Stellar service listen port
STELLAR_SERVICE_PORT=3002

# Testnet passphrase returned in handshake and challenge flows
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015

# Horizon endpoint surfaced to clients via wallet bootstrap metadata
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
```

## Test the verification and recovery flows

### Exercise 1: Basic session verification

**Goal:** Verify that introspection validates tokens and ownership.

1. **Sign up** at `http://localhost:3000/signup`
   - Creates account and issues `{ token, refreshToken, user, session }`
   - Web client stores tokens in localStorage
   
2. **Open DevTools** → Application → Local Storage → `http://localhost:3000`
   - See `auth_session` with stored `AuthSession` data (`token`, `refreshToken`, `user`, `session`)

3. **Visit `/dashboard`** (protected route)
   - Web calls `ensureSessionContinuity()` → calls `GET /api/v1/auth/introspect`
   - API verifies access token is valid and returns `{ valid: true, userId, role }`
   - Route guard allows access because `userId` matches stored session

4. **Verify session metadata**
   - `session.userId` matches `user.id`
   - `session.wallet` includes Stellar network metadata for future wallet-link flows

### Exercise 2: Token recovery after expiry

**Goal:** Verify that expired access tokens are recovered via refresh.

1. **Sign in** at `http://localhost:3000/login` (or use existing session)

2. **Mock access token expiry** (without waiting 15 minutes):
   ```javascript
   // In DevTools console:
   const session = JSON.parse(localStorage.getItem('auth_session'));
   session.token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.invalid';
   localStorage.setItem('auth_session', JSON.stringify(session));
   ```

3. **Reload page** (`Cmd+R`)
   - Web calls `ensureSessionContinuity()`
   - `GET /api/v1/auth/introspect` fails (token is invalid)
   - Web calls `POST /api/v1/auth/refresh` with stored refresh token
   - API issues new `{ accessToken, refreshToken }` pair
   - Web stores new tokens and stays signed in (status: `'refreshed'`)

4. **Verify recovery preserves ownership**
   - Stored `userId` before reload: `user-123`
   - Client preserves the same `user` and `session.wallet` metadata after refresh
   - Route guard allows access with matching `userId`

5. **Verify single-use refresh**:
   ```bash
   # In API logs, see:
   # [refresh] userId=user-123 old_jti=abc123 → revoked
   # [refresh] userId=user-123 new_jti=xyz789 → issued
   ```

### Exercise 3: Session restoration on app relaunch

**Goal:** Verify that mobile app restores session on relaunch.

1. **Sign in** on mobile
   - Session stored in `expo-secure-store`
   - AuthProvider mounts, calls `ensureSessionContinuity()`

2. **Close app completely**

3. **Relaunch app**
   - AuthProvider mounts, retrieves stored tokens from SecureStore
   - Calls `GET /api/v1/auth/introspect` to verify access token
   - If valid → stays signed in (status: `'valid'`)
   - If expired → calls `POST /api/v1/auth/refresh` → stays signed in (status: `'refreshed'`)
   - If both fail → clears storage, redirects to login (status: `'expired'`)

4. **Verify ownership is preserved across relaunch**
   - Original `session.userId` from storage matches API response
   - Role and metadata are in sync

### Exercise 4: Auth-to-Stellar handshake and verify seam

**Goal:** Verify the boundary contributors will extend for future wallet-linked identity.

1. **Fetch handshake metadata**
   - Call `GET /api/v1/auth/handshake`
   - Response should include Stellar network metadata from `apps/stellar-service`

2. **Generate a challenge**
   - Call `POST /api/v1/stellar/auth/challenge`
   - Provide a plausible Stellar public key
   - Response should include `transactionXdr`, `networkPassphrase`, and `expiresAt`

3. **Verify a supported session token format**
   - Call `POST /api/v1/stellar/auth/verify`
   - Use a session token that matches the current starter rule (`local.*` or JWT-shaped `eyJ...`)
   - Response should return `verified: true` and the normalized Stellar account id

4. **Verify a failure path**
   - Repeat with an unsupported session token like `garbage-token`
   - Response should fail with `AUTH_INVALID_SESSION`

5. **Contributor note**
   - This seam intentionally stops at token-format + key-shape checks
   - On-chain proof and wallet custody belong to later milestones

### Exercise 5: Protected route guarding

**Goal:** Verify that protected routes enforce ownership and deny access correctly.

1. **Sign out** completely (clear localStorage)

2. **Visit `/dashboard` directly** (without signing in)
   - Web calls `evaluateProtectedRouteGuard(null)`
   - Returns `{ allowed: false, reason: 'missing_session' }`
   - Next.js redirects to `/login`

3. **Sign in**
   - Stored session has `userId: user-123`
   - Visit `/dashboard` again
   - Guard returns `{ allowed: true, userId: 'user-123', role: 'PLANNER' }`
   - Route renders protected content

4. **Manually clear userId from stored session**:
   ```javascript
   const session = JSON.parse(localStorage.getItem('auth_session'));
   session.user.id = null; // Simulate data corruption
   localStorage.setItem('auth_session', JSON.stringify(session));
   location.reload();
   ```

5. **Verify guard detects mismatch**
   - Guard evaluation finds `userId: null` in guard result
   - Returns `{ allowed: false, reason: 'missing_session' }`
   - Redirects to login

## Run the test suites

### API — Ownership isolation and recovery tests

```bash
cd apps/api
pnpm test -- session.service.test.ts       # Unit tests
pnpm test -- session-ownership.integration.test.ts  # Integration tests
```

**What they verify:**
- ✅ Ownership isolation during concurrent refresh
- ✅ Single-use refresh token enforcement
- ✅ Introspection does not leak user data
- ✅ Logout is idempotent

### Web — Session continuity and recovery tests

```bash
cd apps/web
pnpm test -- session-continuity.test.ts
```

**What they verify:**
- ✅ Token verification on app boot (introspect)
- ✅ Token recovery when access token expires (refresh)
- ✅ Ownership preservation through recovery
- ✅ Protected route guard enforcement
- ✅ Multi-role session support

### Mobile — Session continuity tests

```bash
cd apps/mobile
pnpm test -- sessionContinuity.test.ts
```

**What they verify:**
- ✅ Session restoration with SecureStore
- ✅ Ownership preservation across app relaunch
- ✅ Multi-user device isolation
- ✅ Role-based route guarding

### Full stack type checking

```bash
pnpm typecheck
```

**Ensures:**
- Web, Mobile, and API all import shared contracts from `@themixmatch/types`
- No drift in session, refresh, or introspect types

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "Token is not valid" on `/dashboard` | Access token expired or malformed | Sign in again, or wait for recovery via refresh |
| "Refresh token is invalid or expired" | Refresh token expired (7d) or already used (single-use) | Clear localStorage and sign in again |
| Web can't reach API | `NEXT_PUBLIC_API_BASE_URL` not set or wrong port | Set `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001` in `.env.local` |
| Mobile can't reach API | `EXPO_PUBLIC_API_BASE_URL` not set | Set `EXPO_PUBLIC_API_BASE_URL=http://localhost:3001` in `.env.local` |
| Session lost after browser reload | localStorage cleared or tokens invalidated | Check browser storage policies; sign in again |
| Different userId after refresh | Ownership mismatch bug | Check API logs for `[refresh]` entries; verify `jti` consistency |

## Related documentation

- [Authentication](./AUTHENTICATION.md) — API routes, contracts, env values, and extension notes
- [Session Lifecycle](../../docs/SESSION_LIFECYCLE.md) — Cross-workspace bootstrap, refresh, logout, and Stellar seam
- [Stellar auth safety](./STELLAR_AUTH_SAFETY.md) — Boundary and abuse-control notes for wallet-facing flows