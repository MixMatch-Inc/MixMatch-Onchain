/**
 * Session Lifecycle — Scope & Contracts
 *
 * Track: session lifecycle | auth guard  |  Sprint 1
 * Issues: #684 (implement), #686 (harden), #687 (integrate/document), #688 (auth guard scope)
 *
 * Defines the boundary, state machine, and security contracts for the
 * session lifecycle workstream. Implementation lives in:
 *   apps/api/src/modules/auth/session.service.ts
 *   apps/api/src/modules/auth/session.store.ts
 *   apps/api/src/modules/auth/session.types.ts
 */

// ---------------------------------------------------------------------------
// Session state machine
// ---------------------------------------------------------------------------

/**
 * Every session transitions through these states exactly once.
 *
 *   ACTIVE ──── refresh ────► ACTIVE (new session, old one destroyed)
 *   ACTIVE ──── revoke  ────► REVOKED
 *   ACTIVE ──── expire  ────► EXPIRED
 *   REVOKED / EXPIRED ──────► (terminal — no further transitions)
 */
export type SessionState = "active" | "revoked" | "expired";

// ---------------------------------------------------------------------------
// Core session contract
// ---------------------------------------------------------------------------

/** The full shape of a session record as stored and queried. */
export interface SessionRecord {
  id: string;           // UUID — unique session identifier
  userId: string;       // owner of this session
  refreshToken: string; // opaque UUID — single use, rotated on every refresh
  expiresAt: string;    // ISO 8601 — when the refresh token expires
  createdAt: string;    // ISO 8601 — when the session was created
}

/**
 * Token pair returned on session creation or refresh.
 * - accessToken: short-lived JWT (sub = userId), stateless verification
 * - refreshToken: long-lived opaque UUID stored server-side, single use
 */
export interface SessionTokenPair {
  accessToken: string;
  refreshToken: string;
}

// ---------------------------------------------------------------------------
// Configuration contract
// ---------------------------------------------------------------------------

/** Runtime limits enforced by SessionService. */
export interface SessionLimits {
  /** How long a refresh token is valid (milliseconds). Default: 7 days. */
  refreshTokenExpiryMs: number;
  /** Maximum concurrent active sessions per user. Default: 5. */
  maxActiveSessions: number;
}

// ---------------------------------------------------------------------------
// Auth guard contract (issue #688 — define scope and contracts)
// ---------------------------------------------------------------------------

/**
 * Guards available to protect Express route handlers.
 * Compose them in the order shown — later guards depend on earlier ones.
 *
 * Usage pattern:
 *   router.get("/me", requireAuth, asyncHandler(controller.me));
 *   router.get("/admin", requireAuth, requireRole("ADMIN"), asyncHandler(...));
 *   router.put("/profile/:id", requireAuth, allowOwnership, asyncHandler(...));
 */
export interface AuthGuardContract {
  /**
   * requireAuth
   * Validates the Bearer JWT in Authorization header.
   * On success: attaches req.userId and req.role.
   * On failure: throws 401 INVALID_TOKEN or 401 TOKEN_EXPIRED.
   */
  requireAuth: "middleware";

  /**
   * requireRole(role)
   * Must be applied AFTER requireAuth.
   * Throws 403 INSUFFICIENT_PERMISSIONS when req.role \!== role.
   */
  requireRole: "middleware-factory";

  /**
   * allowOwnership
   * Must be applied AFTER requireAuth.
   * Compares req.userId to req.params.id.
   * Throws 400 VALIDATION_ERROR when param is missing.
   * Throws 403 INSUFFICIENT_PERMISSIONS when IDs do not match.
   */
  allowOwnership: "middleware";
}

/** Error codes produced by auth guard middleware. */
export type AuthGuardErrorCode =
  | "INVALID_TOKEN"             // 401 — missing, malformed, or invalid JWT
  | "TOKEN_EXPIRED"             // 401 — JWT past its exp claim
  | "INSUFFICIENT_PERMISSIONS"  // 403 — role or ownership check failed
  | "VALIDATION_ERROR";         // 400 — missing route param

// ---------------------------------------------------------------------------
// Edge cases (issue #686 — harden)
// ---------------------------------------------------------------------------

/**
 * Session lifecycle edge cases and expected behaviour:
 *
 * | Scenario                               | Expected outcome                          |
 * |----------------------------------------|-------------------------------------------|
 * | Refresh with valid token               | New access + refresh pair; old invalidated |
 * | Refresh with expired refresh token     | InvalidRefreshTokenError                  |
 * | Refresh with already-used token        | InvalidRefreshTokenError                  |
 * | Refresh with empty string              | InvalidRefreshTokenError                  |
 * | Refresh with tampered token            | InvalidRefreshTokenError                  |
 * | Access token passed as refresh token   | InvalidRefreshTokenError (not found)      |
 * | Revoke valid session                   | Session deleted; token unusable           |
 * | Revoke already-revoked session         | InvalidRefreshTokenError                  |
 * | Create 6th session (limit is 5)        | InvalidRefreshTokenError                  |
 * | Revoke all for user A; user B intact   | User B sessions unaffected                |
 */
export type SessionEdgeCases = true; // marker — see apps/api/src/modules/auth/tests/

// ---------------------------------------------------------------------------
// Integration map (issue #687 — integrate and document)
// ---------------------------------------------------------------------------

/**
 * How the session lifecycle wires into adjacent systems:
 *
 * Register / Login:
 *   AuthService ──► SessionService.createSession(userId)
 *                       └──► returns { accessToken, refreshToken }
 *
 * Token refresh:
 *   POST /api/auth/refresh ──► SessionService.refreshSession(refreshToken)
 *                                   └──► rotates tokens; old session deleted
 *
 * Session revocation (logout):
 *   (future endpoint) ──► SessionService.revokeSession(refreshToken)
 *
 * Auth guard:
 *   requireAuth ──► verifies accessToken JWT (stateless; no DB call)
 *   All protected routes use requireAuth; role/ownership guards stack on top.
 *
 * Audit trail:
 *   TOKEN_REFRESHED  ──► on successful refresh
 *   SESSION_REVOKED  ──► on explicit revocation
 *   ACCESS_DENIED    ──► on guard rejection (via auditResponseEvents middleware)
 */
export type SessionIntegrationMap = true; // marker — see apps/docs/session-lifecycle.md
