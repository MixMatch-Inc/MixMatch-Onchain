# Account State Middleware

Account-state-aware authentication middleware that enforces access policies based on user verification status, onboarding completion, and moderation state.

## Overview

This middleware extends basic authentication (`requireAuth`) with additional policy checks to prevent unverified or incomplete users from accessing protected routes prematurely.

## Access Policies

### Policy Types

| Policy | Description | Requirements |
|--------|-------------|--------------|
| `AUTHENTICATED` | Basic authentication | Valid JWT token |
| `VERIFIED` | Email verified | Account status = `ACTIVE` |
| `ONBOARDING_COMPLETE` | Onboarding finished | `onboardingCompleted = true` |
| `MODERATION_CLEAR` | No moderation issues | Moderation state = `CLEAR` |
| `FULL_ACCESS` | Complete access | Verified + Onboarding complete + Moderation clear |

### Policy Hierarchy

```
AUTHENTICATED (lowest)
    ↓
VERIFIED
    ↓
ONBOARDING_COMPLETE
    ↓
MODERATION_CLEAR
    ↓
FULL_ACCESS (highest)
```

## Usage

### Basic Usage

```typescript
import { 
  requireAuth,
  enforcePolicy,
  AccessPolicy,
  requireVerified,
  requireOnboardingComplete,
  requireModerationClear,
  requireFullAccess
} from './middleware/account-state';

// Using policy factory
app.get('/protected', 
  requireAuth,
  enforcePolicy(AccessPolicy.VERIFIED),
  handler
);

// Using convenience middleware
app.get('/dashboard', 
  requireAuth,
  requireOnboardingComplete,
  handler
);

app.post('/bookings', 
  requireAuth,
  requireFullAccess,
  handler
);
```

### Route Configuration Examples

```typescript
import { Router } from 'express';
import { requireAuth, enforcePolicy, AccessPolicy } from '../middleware/account-state';

const router = Router();

// Public routes - no auth required
router.get('/public', publicHandler);

// Authenticated only
router.get('/profile', requireAuth, getProfile);

// Verified email required
router.post('/bookings', 
  requireAuth,
  enforcePolicy(AccessPolicy.VERIFIED),
  createBooking
);

// Onboarding complete required
router.get('/discover', 
  requireAuth,
  enforcePolicy(AccessPolicy.ONBOARDING_COMPLETE),
  getDiscoveries
);

// Full access required
router.post('/payments', 
  requireAuth,
  enforcePolicy(AccessPolicy.FULL_ACCESS),
  processPayment
);

export default router;
```

## Response Structure

### Success Response

When policy check passes, the middleware:
1. Loads user account state from database
2. Attaches `accountState` to request object
3. Calls `next()` to proceed to handler

```typescript
// Request object after middleware
req.user = {
  userId: 'user-123',
  role: 'MUSIC_LOVER',
  // ... other auth fields
};

req.accountState = {
  userId: 'user-123',
  accountStatus: 'ACTIVE',
  moderationState: 'CLEAR',
  onboardingCompleted: true,
  isVerified: true,
  isRestricted: false,
  isSuspended: false,
};
```

### Denial Response

When policy check fails, returns structured error:

```json
{
  "code": "ACCESS_DENIED",
  "policy": "VERIFIED",
  "reason": "Email not verified",
  "message": "Please verify your email address before accessing this feature. Check your inbox for a verification link.",
  "requiredState": {
    "isVerified": true
  },
  "currentState": {
    "isVerified": false,
    "accountStatus": "PENDING_VERIFICATION"
  },
  "action": "VERIFY_EMAIL"
}
```

### Action Codes

| Action | Description | Client Behavior |
|--------|-------------|-----------------|
| `VERIFY_EMAIL` | User needs to verify email | Show email verification prompt |
| `COMPLETE_ONBOARDING` | User needs to finish onboarding | Redirect to onboarding flow |
| `CONTACT_SUPPORT` | Account restricted/suspended | Show support contact info |
| `UNKNOWN` | Invalid policy | Log error, show generic message |

## Account State Object

The middleware injects an `accountState` object into the request:

```typescript
interface AccountState {
  userId: string;
  accountStatus: AccountStatus;       // ACTIVE, SUSPENDED, BANNED, PENDING_VERIFICATION
  moderationState: ModerationState;   // CLEAR, UNDER_REVIEW, RESTRICTED, BANNED
  onboardingCompleted: boolean;
  isVerified: boolean;                // accountStatus === ACTIVE
  isRestricted: boolean;              // moderationState !== CLEAR
  isSuspended: boolean;               // accountStatus === SUSPENDED || BANNED
}
```

## Advanced Usage

### Custom Policy Checking

```typescript
import { loadAccountState, checkPolicyCompliance, AccessPolicy } from './middleware/account-state';

// Manual policy check in controller
app.get('/custom', requireAuth, async (req, res) => {
  const accountState = await loadAccountState(req.user.userId);
  
  // Check multiple policies
  const verified = checkPolicyCompliance(accountState, AccessPolicy.VERIFIED);
  const onboarded = checkPolicyCompliance(accountState, AccessPolicy.ONBOARDING_COMPLETE);
  
  if (!verified.compliant) {
    return res.status(403).json(verified.denial);
  }
  
  if (!onboarded.compliant) {
    return res.status(403).json(onboarded.denial);
  }
  
  // Proceed with handler logic
  res.json({ message: 'Access granted' });
});
```

### Combining with Role-Based Access

```typescript
import { requireAuth, requireRole, enforcePolicy, AccessPolicy } from './middleware';
import { UserRole } from '@mixmatch/types';

// DJ-only routes with full access
app.post('/dj/performances',
  requireAuth,
  requireRole([UserRole.DJ]),
  enforcePolicy(AccessPolicy.FULL_ACCESS),
  createPerformance
);

// Admin routes bypass some checks
app.delete('/users/:id',
  requireAuth,
  requireRole([UserRole.ADMIN]),
  deleteUser
);
```

## Error Handling

### Error Codes

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `AUTH_009` | 403 | Email not verified |
| `AUTH_007` | 403 | Onboarding not completed |
| `AUTH_011` | 403 | Account restricted |
| `AUTH_012` | 403 | Account suspended |

### Structured Denial Errors

All policy violations return consistent error structure:

```typescript
interface PolicyDenial {
  policy: AccessPolicy;           // Which policy failed
  reason: string;                 // Technical reason
  userMessage: string;            // User-friendly message
  requiredState: Partial<AccountState>;  // What's needed
  currentState: Partial<AccountState>;   // Current state
}
```

## Testing

### Unit Testing

```typescript
import { checkPolicyCompliance, AccessPolicy } from '../middleware/account-state';

test('VERIFIED policy denies unverified user', () => {
  const accountState = {
    userId: 'user-1',
    accountStatus: 'PENDING_VERIFICATION',
    moderationState: 'CLEAR',
    onboardingCompleted: false,
    isVerified: false,
    isRestricted: false,
    isSuspended: false,
  };
  
  const result = checkPolicyCompliance(accountState, AccessPolicy.VERIFIED);
  
  assert.equal(result.compliant, false);
  assert.equal(result.denial?.policy, 'VERIFIED');
  assert.equal(result.denial?.action, 'VERIFY_EMAIL');
});
```

### Integration Testing

See [`tests/account-state-middleware.test.ts`](../tests/account-state-middleware.test.ts) for comprehensive integration tests covering:
- All access policy types
- Structured denial responses
- Account state loading
- Policy compliance checking
- Edge cases and error conditions

## Migration Guide

### From `requireEmailVerified`

**Before:**
```typescript
import { requireEmailVerified } from './middleware/email-verified';

app.get('/protected', requireAuth, requireEmailVerified, handler);
```

**After:**
```typescript
import { enforcePolicy, AccessPolicy } from './middleware/account-state';

app.get('/protected', requireAuth, enforcePolicy(AccessPolicy.VERIFIED), handler);
```

The new middleware provides:
- ✅ More detailed error responses
- ✅ Account state injection
- ✅ Consistent policy framework
- ✅ Support for multiple policy types

## Best Practices

1. **Always use `requireAuth` first** - Account state middleware depends on authenticated user
2. **Use convenience exports** - Prefer `requireVerified` over `enforcePolicy(AccessPolicy.VERIFIED)` for readability
3. **Handle denial responses** - Client should check `action` field to guide user
4. **Cache account state** - Middleware loads from DB on each request; consider caching for high-traffic routes
5. **Test all policies** - Write tests for each policy level your routes use

## Architecture

```
Request Flow:
1. requireAuth → Validates JWT, sets req.user
2. enforcePolicy → Loads account state, checks compliance
3. Handler → Accesses req.accountState, processes request

Data Flow:
User Repository → Account State → Policy Check → Response
```

## See Also

- [Auth Middleware](./auth.middleware.ts) - Basic JWT authentication
- [Email Verified Middleware](./email-verified.middleware.ts) - Legacy verification check
- [Error Types](../utils/errors.ts) - Structured error definitions
- [Onboarding Registry](../../../packages/types/src/onboarding-registry.ts) - Onboarding step definitions
