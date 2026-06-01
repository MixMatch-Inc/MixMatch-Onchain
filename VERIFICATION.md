# Authentication Implementation Verification

This document provides step-by-step instructions to verify the AUTH-068 implementation.

## Prerequisites

```bash
# Ensure you have the correct Node version
node --version  # Should be 20+

# Enable pnpm via Corepack
corepack enable

# Install dependencies
pnpm install
```

## 1. Type Safety Verification

Verify all packages compile without errors:

```bash
pnpm typecheck
```

**Expected Output:**
```
✓ @themixmatch/types:typecheck
✓ @themixmatch/api:typecheck
✓ @themixmatch/web:typecheck
✓ @themixmatch/mobile:typecheck
✓ @themixmatch/stellar-service:typecheck

Tasks: 5 successful, 5 total
```

## 2. Build Verification

Build all packages:

```bash
pnpm build
```

**Expected Output:**
- Types package builds successfully
- API compiles without errors
- Web builds Next.js production bundle
- Stellar service compiles

## 3. API Service Verification

### Start the API

```bash
cd apps/api
pnpm dev
```

**Expected Output:**
```
API listening on http://localhost:3001
```

### Test Endpoints

In a new terminal:

```bash
# Health check
curl http://localhost:3001/health

# API routes listing
curl http://localhost:3001/api/v1

# Register a new user
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "role": "DJ"
  }'

# Expected: 201 response with token, refreshToken, user, and session
```

### Verify Response Shape

The registration response should match:

```json
{
  "success": true,
  "data": {
    "token": "eyJ...",
    "refreshToken": "eyJ...",
    "user": {
      "id": "...",
      "name": "test",
      "email": "test@example.com",
      "role": "DJ",
      "onboardingCompleted": false
    },
    "session": {
      "userId": "...",
      "role": "DJ",
      "onboardingCompleted": false,
      "issuedAt": "2026-06-01T...",
      "wallet": {
        "service": "stellar-service",
        "status": "unlinked",
        "networkPassphrase": "...",
        "horizonUrl": "...",
        "availableWallets": [...]
      }
    }
  }
}
```

## 4. Web App Verification

### Start the Web App

```bash
# In a new terminal
cd apps/web
pnpm dev
```

**Expected Output:**
```
▲ Next.js 15.x
- Local: http://localhost:3000
```

### Manual Testing Flow

1. **Visit Home Page**
   - Navigate to `http://localhost:3000`
   - Should see landing page

2. **Registration Flow**
   - Navigate to `http://localhost:3000/signup`
   - Fill in:
     - Email: `user@example.com`
     - Password: `password123` (min 8 chars)
     - Role: Select "DJ", "Planner", or "Music Lover"
   - Click "Create account"
   - Should redirect to `/dashboard`

3. **Dashboard (Protected Route)**
   - Should see welcome message with user name
   - Should display user ID, role, and session info
   - Should show "Sign out" button

4. **Session Persistence**
   - Refresh the page (F5)
   - Should remain on dashboard (session restored)
   - Check browser DevTools → Application → Local Storage
   - Should see `mixmatch-auth-session` key

5. **Logout Flow**
   - Click "Sign out"
   - Should redirect to `/login`
   - Local storage should be cleared

6. **Login Flow**
   - Navigate to `http://localhost:3000/login`
   - Enter credentials from registration
   - Click "Sign in"
   - Should redirect to `/dashboard`

### Error State Testing

1. **Invalid Credentials**
   - Try logging in with wrong password
   - Should see error message

2. **Rate Limiting**
   - Try logging in with wrong password 5+ times
   - Should see throttle notice with retry countdown

3. **Validation Errors**
   - Try submitting empty form
   - Try password less than 8 characters
   - Should see validation errors

## 5. Mobile App Verification

### Start the Mobile App

```bash
# In a new terminal
cd apps/mobile
pnpm dev
```

**Expected Output:**
```
Metro waiting on exp://...
```

### Testing with Expo Go

1. **Install Expo Go**
   - iOS: Download from App Store
   - Android: Download from Play Store

2. **Scan QR Code**
   - Scan the QR code from terminal
   - App should load

3. **Test Authentication Flow**
   - Home screen shows "No session found"
   - Tap "Create account"
   - Fill registration form
   - Submit → should return to home showing authenticated state
   - Close app completely
   - Reopen → session should be restored
   - Tap "Sign out" → should clear session

## 6. Shared Contract Verification

### Verify Type Consistency

```bash
# Check that all workspaces use the same types
grep -r "from '@themixmatch/types'" apps/*/src --include="*.ts" --include="*.tsx" | wc -l
```

Should show multiple imports across API, web, and mobile.

### Verify Field Name Consistency

All workspaces should use:
- `token` (not `accessToken` in some places)
- `refreshToken` (consistent naming)
- `user.id`, `user.email`, `user.role`
- `session.userId`, `session.issuedAt`

## 7. Documentation Verification

Verify all documentation is in place:

```bash
ls -la docs/
ls -la apps/api/docs/
ls -la apps/web/docs/
ls -la apps/mobile/docs/
```

**Expected Files:**
- `docs/SESSION_LIFECYCLE.md`
- `docs/MONOREPO_AUTH_SETUP.md`
- `docs/AUTH-068-IMPLEMENTATION-SUMMARY.md`
- `apps/api/docs/AUTHENTICATION.md`
- `apps/api/docs/REGISTRATION_FLOW.md`
- `apps/api/docs/LOCAL_AUTH_SETUP.md`
- `apps/web/docs/WEB_AUTH_SETUP.md`
- `apps/mobile/docs/MOBILE_AUTH_SETUP.md`

## 8. Integration Testing

### Full Stack Flow

With API, Web, and Stellar service running:

1. **Register via Web**
   - Create account on web app
   - Verify token stored in localStorage

2. **Verify API Session**
   ```bash
   # Use the token from localStorage
   curl http://localhost:3001/api/v1/auth/introspect \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```
   - Should return `{ "valid": true, "userId": "...", ... }`

3. **Test Token Refresh**
   ```bash
   # Use the refreshToken from localStorage
   curl -X POST http://localhost:3001/api/v1/auth/refresh \
     -H "Content-Type: application/json" \
     -d '{ "refreshToken": "YOUR_REFRESH_TOKEN_HERE" }'
   ```
   - Should return new token pair

4. **Test Logout**
   ```bash
   curl -X POST http://localhost:3001/api/v1/auth/logout \
     -H "Content-Type: application/json" \
     -d '{ "refreshToken": "YOUR_REFRESH_TOKEN_HERE" }'
   ```
   - Should return `{ "loggedOut": true }`
   - Previous refresh token should no longer work

## Success Criteria

✅ All typechecks pass  
✅ All builds complete successfully  
✅ API endpoints respond correctly  
✅ Web app registration/login works  
✅ Web app session persists on reload  
✅ Mobile app authentication works  
✅ Mobile app session persists on relaunch  
✅ Error states display properly  
✅ Rate limiting works  
✅ Documentation is complete  
✅ Shared types are used consistently  

## Troubleshooting

### API won't start
- Check if port 3001 is available
- Verify `.env` file exists (copy from `.env.example`)
- Check `JWT_SECRET` is set

### Web app can't connect to API
- Verify API is running on port 3001
- Check `NEXT_PUBLIC_API_BASE_URL` in `.env`
- Check browser console for CORS errors

### Mobile app shows "Network error"
- Verify API is accessible from your device
- Check `EXPO_PUBLIC_API_BASE_URL` in `.env`
- Try using your computer's IP address instead of localhost

### Session not persisting
- Check browser localStorage (web)
- Check SecureStore availability (mobile)
- Verify refresh token is being stored
- Check API `/auth/refresh` endpoint works

### TypeScript errors
- Run `pnpm clean` then `pnpm install`
- Build types package: `pnpm --filter @themixmatch/types build`
- Delete `tsconfig.tsbuildinfo` files
- Run `pnpm typecheck` again

## Next Steps

After verification, you can:

1. **Add more protected routes** - Follow the `/dashboard` pattern
2. **Implement user profiles** - Extend the user types
3. **Add password reset** - Create new endpoints
4. **Integrate Stellar wallet** - Use the wallet bootstrap data
5. **Add comprehensive tests** - Write unit and integration tests

For detailed implementation guidance, see:
- `docs/AUTH-068-IMPLEMENTATION-SUMMARY.md`
- `docs/SESSION_LIFECYCLE.md`
- `docs/MONOREPO_AUTH_SETUP.md`
