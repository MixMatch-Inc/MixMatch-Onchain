export type ISOTimestamp = string;

/** Supabase user ID (UUID) or anonymous session token */
export type AuthUserId = string;

/** Stable identifier for a browser/device session */
export type SessionId = string;

/**
 * Describes the current throttle state for an auth identifier (email / IP).
 * Returned on every auth response so the client can render feedback without
 * a separate status call.
 */
export interface AuthThrottleState {
  /** Whether the identifier is currently rate-limited */
  limited: boolean;
  /**
   * How many attempts remain before the next cooldown window.
   * `null` when already limited.
   */
  attemptsRemaining: number | null;
  /**
   * Unix epoch (ms) when the rate-limit window resets.
   * `null` when not currently limited.
   */
  resetsAt: ISOTimestamp | null;
  /** Total window duration in seconds */
  windowSeconds: number;
  /** Max attempts allowed per window */
  maxAttempts: number;
}

/**
 * Exponential back-off state applied after repeated failures.
 * Distinct from throttling: cooldown applies to an account, throttle to a
 * request identity (IP / email prefix).
 */
export interface AuthCooldownState {
  active: boolean;
  /** ISO timestamp when the cooldown expires. `null` when not active. */
  expiresAt: ISOTimestamp | null;
  /** How many consecutive failures triggered this cooldown */
  failureCount: number;
  /** Cooldown duration in seconds for this tier */
  durationSeconds: number;
}

export type AuthRiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Risk assessment attached to an auth attempt.
 * The server populates this; clients use it for UX decisions only —
 * never for access control.
 */
export interface AuthRiskSignal {
  level: AuthRiskLevel;
  /**
   * Machine-readable reasons behind the risk level.
   * Stable strings — safe to branch on in client code.
   */
  reasons: AuthRiskReason[];
  /** Whether additional verification (e.g. email OTP) is required */
  requiresVerification: boolean;
  // SEAM: MFA — add `requiresMfa: boolean` here in the MFA milestone
}

export type AuthRiskReason =
  | 'new_device'
  | 'new_location'
  | 'high_failure_rate'
  | 'leaked_credential'
  | 'suspicious_timing'
  | 'vpn_detected';

export type AuthEventType =
  | 'login_attempt'
  | 'login_success'
  | 'login_failure'
  | 'logout'
  | 'signup_attempt'
  | 'signup_success'
  | 'signup_failure'
  | 'password_reset_request'
  | 'password_reset_complete'
  | 'session_refresh'
  | 'rate_limit_hit'
  | 'cooldown_triggered'
  | 'account_locked';

/**
 * Immutable record of a single auth event.
 * Written server-side; read by audit/observability tooling.
 */
export interface AuthAuditEvent {
  id: string;
  type: AuthEventType;
  userId: AuthUserId | null;
  sessionId: SessionId | null;
  /** Hashed IP — never store raw IPs in audit logs */
  ipHash: string | null;
  userAgent: string | null;
  occurredAt: ISOTimestamp;
  /** Freeform metadata bag — keep values serialisable */
  metadata: Record<string, string | number | boolean | null>;
}

export interface LoginRequest {
  email: string;
  password: string;
  /** Client-generated session token for continuity tracking */
  sessionId?: SessionId;
}

export interface SignupRequest {
  email: string;
  password: string;
  sessionId?: SessionId;
  // SEAM: profile — add `displayName?: string` in profile milestone
}

export interface PasswordResetRequest {
  email: string;
}

export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_CONFIRMED'
  | 'ACCOUNT_LOCKED'
  | 'RATE_LIMITED'
  | 'COOLDOWN_ACTIVE'
  | 'RISK_BLOCKED'
  | 'WEAK_PASSWORD'
  | 'EMAIL_ALREADY_EXISTS'
  | 'SESSION_EXPIRED'
  | 'UNKNOWN';

/**
 * Every auth endpoint returns this envelope.
 * Success and failure share the same shape so clients branch on `success`,
 * not on HTTP status alone.
 */
export interface AuthResponse<T = null> {
  success: boolean;
  data: T | null;
  error: AuthErrorCode | null;
  /** Human-readable message safe to show in UI */
  message: string | null;
  throttle: AuthThrottleState;
  cooldown: AuthCooldownState;
  risk: AuthRiskSignal | null;
}

export interface LoginResponseData {
  userId: AuthUserId;
  sessionId: SessionId;
  /** ISO timestamp when the session expires */
  expiresAt: ISOTimestamp;
  // SEAM: roles — add `role: UserRole` in RBAC milestone
}

export interface SignupResponseData {
  userId: AuthUserId;
  /** True when email confirmation is required before login is allowed */
  confirmationPending: boolean;
}

/**
 * Lightweight session risk snapshot stored client-side.
 * Refreshed on every auth API response.
 */
export interface SessionRiskSummary {
  sessionId: SessionId;
  riskLevel: AuthRiskLevel;
  requiresVerification: boolean;
  evaluatedAt: ISOTimestamp;
}
