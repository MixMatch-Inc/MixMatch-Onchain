/**
 * Session-level contracts shared across API and client workspaces.
 * AUTH-052 — session refresh, introspection, and route gating.
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
