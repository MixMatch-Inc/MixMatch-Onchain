# Account-State-Aware Protected Routes Implementation Summary

## Overview

Successfully implemented auth middleware support for account-state-aware protected routes that prevent unverified or incomplete users from accessing product areas prematurely.

## What Was Implemented

### 1. Access Policy System (`account-state.middleware.ts`)

**File**: `apps/api/src/middleware/account-state.middleware.ts`

#### Access Policy Types
- ✅ `AUTHENTICATED` - Basic authentication requirement
- ✅ `VERIFIED` - Email verification required (account status = ACTIVE)
- ✅ `ONBOARDING_COMPLETE` - Onboarding must be finished
- ✅ `MODERATION_CLEAR` - No moderation restrictions
- ✅ `FULL_ACCESS` - All requirements combined (verified + onboarded + clear)

#### Core Features
- ✅ Policy enforcement middleware factory (`enforcePolicy`)
- ✅ Account state loading from database
- ✅ Policy compliance checking with detailed results
- ✅ Structured denial error responses
- ✅ Request object extension with `accountState`
- ✅ Convenience middleware exports (`requireVerified`, `requireOnboardingComplete`, etc.)
- ✅ Remediation action codes for client guidance

### 2. Structured Error Types

**File**: `apps/api/src/utils/errors.ts`

Added new authentication error types:
- ✅ `AuthError.onboardingNotComplete()` - AUTH_007
- ✅ `AuthError.accountRestricted()` - AUTH_011  
- ✅ `AuthError.accountSuspended()` - AUTH_012

**File**: `packages/types/src/errors.ts`

Added error codes:
- ✅ `AUTH_ACCOUNT_RESTRICTED = 'AUTH_011'`
- ✅ `AUTH_ACCOUNT_SUSPENDED = 'AUTH_012'`
- ✅ Error category mappings for new codes

### 3. Integration Tests

**File**: `apps/api/tests/account-state-middleware.test.ts`

Comprehensive test suite covering:
- ✅ All access policy types (AUTHENTICATED, VERIFIED, ONBOARDING_COMPLETE, MODERATION_CLEAR, FULL_ACCESS)
- ✅ Policy denial response structure validation
- ✅ Account state loading from repository
- ✅ Account state identification (verified, restricted, suspended)
- ✅ Policy compliance checking for each policy type
- ✅ Edge cases and error conditions
- ✅ Remediation action codes

### 4. Documentation

**File**: `apps/api/src/middleware/README-account-state.md`

Complete documentation including:
- ✅ Policy type descriptions and hierarchy
- ✅ Usage examples (basic and advanced)
- ✅ Route configuration patterns
- ✅ Response structure (success and denial)
- ✅ Account state object specification
- ✅ Action codes table
- ✅ Error handling guide
- ✅ Migration guide from legacy middleware
- ✅ Best practices
- ✅ Architecture diagram

**File**: `apps/api/src/middleware/account-state-example.ts`

Practical examples showing:
- ✅ Public routes (no auth)
- ✅ Authenticated-only routes
- ✅ Verified routes
- ✅ Onboarding-complete routes
- ✅ Moderation-clear routes
- ✅ Full-access routes
- ✅ Role-based + policy combinations
- ✅ Custom policy logic
- ✅ Error handling patterns

## Acceptance Criteria Met

✅ **Routes can declare access policy requirements**
- Routes use `enforcePolicy(AccessPolicy.TYPE)` or convenience middleware
- Policies are composable with role-based access control
- Multiple policies can be chained

✅ **Middleware produces structured denial errors**
- Consistent JSON response format
- Includes policy name, reason, user message
- Provides required vs. current state comparison
- Includes actionable remediation code

✅ **Integration tests cover each access policy type**
- All 5 policy types tested
- Account state loading tested
- Compliance checking tested
- Error responses validated
- Edge cases covered

## Usage Examples

### Basic Usage

```typescript
import { requireAuth, requireVerified, requireFullAccess } from './middleware/account-state';

// Email verification required
app.post('/bookings', requireAuth, requireVerified, handler);

// Full access required
app.post('/payments', requireAuth, requireFullAccess, handler);
```

### Policy Factory

```typescript
import { enforcePolicy, AccessPolicy } from './middleware/account-state';

// Custom policy enforcement
app.get('/discover', 
  requireAuth,
  enforcePolicy(AccessPolicy.ONBOARDING_COMPLETE),
  handler
);
```

### Structured Denial Response

When a policy check fails:

```json
{
  "code": "ACCESS_DENIED",
  "policy": "VERIFIED",
  "reason": "Email not verified",
  "message": "Please verify your email address before accessing this feature.",
  "requiredState": { "isVerified": true },
  "currentState": { "isVerified": false },
  "action": "VERIFY_EMAIL"
}
```

## Architecture

```
Request Flow:
┌─────────────┐
│   Request   │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│   requireAuth   │ ← Validates JWT, sets req.user
└──────┬──────────┘
       │
       ▼
┌──────────────────────┐
│  enforcePolicy(XX)   │ ← Loads account state, checks policy
└──────┬───────────────┘
       │
       ├─✅ Compliant → next() → Handler
       │
       └─❌ Denied → 403 Response with structured error
```

## Account State Object

Injected into `req.accountState` after successful policy check:

```typescript
interface AccountState {
  userId: string;
  accountStatus: AccountStatus;      // ACTIVE, SUSPENDED, BANNED, PENDING_VERIFICATION
  moderationState: ModerationState;  // CLEAR, UNDER_REVIEW, RESTRICTED, BANNED
  onboardingCompleted: boolean;
  isVerified: boolean;               // accountStatus === ACTIVE
  isRestricted: boolean;             // moderationState !== CLEAR
  isSuspended: boolean;              // SUSPENDED or BANNED
}
```

## Key Benefits

1. **Centralized Policy Logic** - All access policies in one place
2. **Consistent Error Responses** - Structured denials with actionable guidance
3. **Composable** - Works with existing `requireAuth` and `requireRole`
4. **Type-Safe** - Full TypeScript support
5. **Testable** - Comprehensive test coverage
6. **Extensible** - Easy to add new policy types
7. **Client-Friendly** - Action codes guide user behavior

## Files Created/Modified

### Created
- `apps/api/src/middleware/account-state.middleware.ts` (300 lines)
- `apps/api/tests/account-state-middleware.test.ts` (345 lines)
- `apps/api/src/middleware/README-account-state.md` (343 lines)
- `apps/api/src/middleware/account-state-example.ts` (190 lines)

### Modified
- `apps/api/src/utils/errors.ts` - Added 3 new AuthError methods
- `packages/types/src/errors.ts` - Added 2 new error codes + category mappings

## Next Steps (Optional Enhancements)

1. **Caching Layer** - Cache account state to reduce DB queries
2. **Metrics** - Track policy denial rates for monitoring
3. **Dynamic Policies** - Load policies from configuration
4. **Policy Combinations** - Support OR logic (e.g., VERIFIED OR ADMIN)
5. **Rate Limiting** - Different limits based on account state

## Testing

Run the integration tests:

```bash
cd apps/api
npm test -- tests/account-state-middleware.test.ts
```

## Migration from Legacy Middleware

Replace `requireEmailVerified` with the new middleware:

```typescript
// Before
import { requireEmailVerified } from './middleware/email-verified';
app.get('/protected', requireAuth, requireEmailVerified, handler);

// After  
import { requireVerified } from './middleware/account-state';
app.get('/protected', requireAuth, requireVerified, handler);
```

The new middleware provides better error messages, account state injection, and a consistent policy framework.
