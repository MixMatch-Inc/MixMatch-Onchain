# @mixmatch/shared

Shared TypeScript types and validation schemas used across the MixMatch Onchain monorepo by `apps/api`, `apps/web`, and `apps/mobile`. This package is the single source of truth for auth-first cross-platform type definitions.

## Contents

### Core Auth Types
- `src/types/auth.ts` — Authentication types (`AuthUser`, `RegisterInput`, `LoginInput`, `AuthTokenResponse`)
- `src/types/auth-guard.ts` — Authorization types (`UserRole`, `AuthGuardOptions`, `GuardResult`, `AuthenticatedRequest`)
- `src/types/auth-errors.ts` — Standardized error codes and responses (`AuthErrorCode`, `AuthErrorResponse`)
- `src/types/session.ts` — Session management types (`Session`, `TokenPair`, `SessionConfig`)
- `src/validation/auth.schema.ts` — Zod validation schemas for auth payloads
- `src/validation/session.schema.ts` — Zod validation schemas for session operations

### Platform Shared Types
- `src/types/audit.ts` — Audit logging types (`AuditAction`, `AuditEntry`)
- `src/types/rate-limit.ts` — Rate limiting types (`RateLimitConfig`, `RateLimitInfo`, `RateLimitStore`)
- `src/types/route-protection.ts` — Route protection configuration
- `src/types/validation.ts` — Shared validation utilities

## Integration Status (Sprint 1)
All core auth types are fully integrated with the API and web apps:
- ✅ API imports and uses all shared auth, session, audit, and rate-limit types
- ✅ Web app imports and uses `AuthUser` for auth context
- ✅ Auth errors in the API consume shared `AuthErrorCode` enum
- ✅ Session management uses shared `Session` and `TokenPair` interfaces

## Usage Example
```typescript
// Import all needed types from the shared package
import type { AuthUser, UserRole, AuthenticatedRequest } from '@mixmatch/shared';
import { UserRole } from '@mixmatch/shared';

// Use in Express (API)
interface AppRequest extends Request, AuthenticatedRequest {}

// Use in React (Web) or React Native (Mobile)
function useCurrentUser(): AuthUser | null {
  // Implementation...
}
```

## Scripts

- `pnpm build` — compile to `dist/`
- `pnpm test` — run unit tests with Vitest
- `pnpm lint` — run ESLint
- `pnpm typecheck` — type-check without emitting

Keep this package limited to genuinely shared concerns. Business logic belongs in the owning app/module.