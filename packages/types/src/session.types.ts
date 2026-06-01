/**
 * Session-level contracts shared across API and client workspaces.
 * AUTH-069–072 — session refresh, introspection, logout, and route gating.
 */

/** Guard contract for protected routes — shared vocabulary across web, mobile, and API. */
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

export interface RefreshTokenRecord {
  /** jti — unique token id */
  jti: string;
  userId: string;
  /** ISO-8601 expiry */
  expiresAt: string;
  /** Whether this token has already been consumed */
  revoked: boolean;
}
