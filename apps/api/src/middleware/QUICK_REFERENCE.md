# Account State Middleware - Quick Reference

## Import

```typescript
import {
  requireAuth,
  enforcePolicy,
  AccessPolicy,
  requireVerified,
  requireOnboardingComplete,
  requireModerationClear,
  requireFullAccess,
  AccountStateRequest,
  AccountState,
} from './middleware/account-state';
```

## Policy Types

| Policy | When to Use | Requirement |
|--------|-------------|-------------|
| `AUTHENTICATED` | Basic protected routes | Valid JWT |
| `VERIFIED` | Actions requiring real users | Email verified |
| `ONBOARDING_COMPLETE` | Core features | Onboarding done |
| `MODERATION_CLEAR` | User-generated content | No restrictions |
| `FULL_ACCESS` | Transactions, payments | All of the above |

## Quick Usage

```typescript
// Method 1: Convenience middleware (recommended)
app.get('/dashboard', requireAuth, requireFullAccess, handler);

// Method 2: Policy factory
app.get('/dashboard', requireAuth, enforcePolicy(AccessPolicy.FULL_ACCESS), handler);
```

## Common Patterns

### Public Route
```typescript
app.get('/public', handler);
```

### Authenticated Only
```typescript
app.get('/profile', requireAuth, handler);
```

### Verified Email Required
```typescript
app.post('/bookings', requireAuth, requireVerified, handler);
```

### Full Access Required
```typescript
app.post('/payments', requireAuth, requireFullAccess, handler);
```

### Role + Policy
```typescript
app.post('/dj/performances',
  requireAuth,
  requireRole([UserRole.DJ]),
  requireFullAccess,
  handler
);
```

## Response Structures

### Success
```typescript
// Middleware adds to request:
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

### Denial (403)
```json
{
  "code": "ACCESS_DENIED",
  "policy": "VERIFIED",
  "reason": "Email not verified",
  "message": "Please verify your email address...",
  "requiredState": { "isVerified": true },
  "currentState": { "isVerified": false },
  "action": "VERIFY_EMAIL"
}
```

## Action Codes for Clients

| Action | Client Behavior |
|--------|-----------------|
| `VERIFY_EMAIL` | Show email verification prompt |
| `COMPLETE_ONBOARDING` | Redirect to onboarding |
| `CONTACT_SUPPORT` | Show support contact |

## Handler Example

```typescript
app.get('/dashboard', requireAuth, requireFullAccess, (req: AccountStateRequest, res) => {
  // Account state is guaranteed available
  const state = req.accountState!;
  
  res.json({
    userId: state.userId,
    canTransact: state.isVerified && state.onboardingCompleted,
  });
});
```

## Error Codes

| Code | Meaning |
|------|---------|
| `AUTH_007` | Onboarding incomplete |
| `AUTH_009` | Email not verified |
| `AUTH_011` | Account restricted |
| `AUTH_012` | Account suspended |

## Testing

```typescript
import { checkPolicyCompliance, AccessPolicy } from '../middleware/account-state';

const result = checkPolicyCompliance(accountState, AccessPolicy.VERIFIED);

if (!result.compliant) {
  console.log(result.denial?.message);
  console.log(result.denial?.action);
}
```

## Migration

```typescript
// Old
import { requireEmailVerified } from './email-verified';
app.get('/route', requireAuth, requireEmailVerified, handler);

// New
import { requireVerified } from './account-state';
app.get('/route', requireAuth, requireVerified, handler);
```

## Files

- **Middleware**: `apps/api/src/middleware/account-state.middleware.ts`
- **Tests**: `apps/api/tests/account-state-middleware.test.ts`
- **Docs**: `apps/api/src/middleware/README-account-state.md`
- **Examples**: `apps/api/src/middleware/account-state-example.ts`
