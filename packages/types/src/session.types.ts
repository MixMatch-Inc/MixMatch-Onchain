/**
 * Session-level contracts shared across API and client workspaces.
 * AUTH-062–065 — ownership, recovery, route gating, and device isolation.
 */

/**
 * Guard contract for protected routes — shared vocabulary across web, mobile, and API.
 *
 * Ownership enforcement (AUTH-062):
 * - `allowed`: Indicates if caller has valid session and meets role requirements
 * - `userId`: Present when allowed; used by API to tie operations to owner
 * - `role`: Present when allowed; used for role-based access control
 * - `reason`: Machine-readable denial reason for client-side recovery logic
 *
 * Client-side usage:
 * - Clients pass this contract through route guards (e.g., /dashboard)
 * - If denied, clients should trigger session recovery (refresh or re-auth)
 */
export interface ProtectedRouteGuard {
  /** Whether the caller may access the protected resource. */
  allowed: boolean;
  /** Present when allowed — the authenticated user id. */
  userId?: string;
  /** Present when allowed — the authenticated user role. */
  role?: string;
  /** Machine-readable reason when access is denied. */
  reason?: "missing_session" | "expired_session" | "invalid_session" | "insufficient_role";
}

/**
 * Refresh token record stored server-side (in-memory or persistent store).
 *
 * Ownership & recovery semantics (AUTH-062):
 * - `jti`: Unique token identifier enabling single-use enforcement
 * - `userId`: The user who owns this token; must match JWT claims at validation
 * - `expiresAt`: Absolute expiry; when passed, refresh fails (user must re-authenticate)
 * - `revoked`: Single-use enforcement flag; set to true when token is consumed
 *
 * Server-side validation flow:
 * 1. Decode refresh JWT → extract userId + jti
 * 2. Fetch record by jti
 * 3. Verify: JWT.userId == record.userId (ownership check)
 * 4. Verify: record.expiresAt > now (lifetime check)
 * 5. Verify: record.revoked == false (single-use check)
 * 6. Set record.revoked = true
 * 7. Issue new token pair with new jti
 */
export interface RefreshTokenRecord {
  /** jti — unique token id */
  jti: string;
  userId: string;
  /** ISO-8601 expiry */
  expiresAt: string;
  /** Whether this token has already been consumed */
  revoked: boolean;
}
