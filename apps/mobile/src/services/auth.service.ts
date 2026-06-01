export type AuthProvider = 'email' | 'google' | 'apple' | 'github';
export type AuthAction =
  | 'login'
  | 'register'
  | 'logout'
  | 'token_refresh'
  | 'password_reset_request'
  | 'password_reset_confirm'
  | 'mfa_challenge'
  | 'mfa_verify';

/**
 * Describes the current throttle state returned by the server alongside
 * any 429 or auth-failure response so the client can surface it accurately.
 */
export interface RateLimitState {
  /** Number of failed attempts recorded in the current window. */
  attemptCount: number;
  /** Max attempts allowed before the account enters cooldown. */
  maxAttempts: number;
  /** Remaining attempts before lockout. null when already locked. */
  attemptsRemaining: number | null;
  /** ISO timestamp when the cooldown window resets. null if not yet locked. */
  cooldownUntil: string | null;
  /** Whether the account is currently in a hard lockout (no retries). */
  isLockedOut: boolean;
}

/** Server response shape for any throttled request (HTTP 429). */
export interface ThrottledAuthResponse {
  success: false;
  code: 'RATE_LIMITED';
  rateLimit: RateLimitState;
  /** Human-readable message safe to show users. */
  message: string;
}

/**
 * One entry in the auth audit log. Written server-side on every auth event
 * and optionally surfaced to users via the session-history UI.
 * SEAM: extend `metadata` for device fingerprint, geo-IP, or MFA method.
 */
export interface AuditEntry {
  id: string;
  userId: string | null; // null for pre-auth failures (e.g. unknown email)
  action: AuthAction;
  success: boolean;
  ipAddress: string;
  userAgent: string;
  timestamp: string; // ISO 8601
  /** Structured extras — keep flat and serialisable. */
  metadata: Record<string, string | number | boolean>;
}

/**
 * Risk level assigned to a session or auth event by the server.
 * SEAM: attach ML-scored risk in a follow-up milestone by extending this type.
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AuthRiskSignal {
  level: RiskLevel;
  /** Human-readable reason (shown in security notifications, not raw errors). */
  reason: string;
  /** Whether the session should be treated as read-only until re-verified. */
  requiresReauth: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
  /** Client-provided device ID for session fingerprinting. */
  deviceId: string;
  provider?: AuthProvider;
  // SEAM: add `mfaCode?: string` when MFA milestone lands
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
  deviceId: string;
  provider?: AuthProvider;
}

export interface PasswordResetRequestPayload {
  email: string;
}

export interface PasswordResetConfirmPayload {
  token: string;
  newPassword: string;
}

export interface TokenRefreshRequest {
  refreshToken: string;
  deviceId: string;
}

export interface AuthTokenPair {
  accessToken: string;
  /** Duration in seconds. */
  expiresIn: number;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
  // SEAM: add `roles`, `mfaEnabled`, `verifiedAt` in follow-up milestones
}

export interface AuthSuccessResponse {
  success: true;
  user: AuthUser;
  tokens: AuthTokenPair;
  riskSignal: AuthRiskSignal;
  /** Populated when the session was granted despite a medium/high risk signal. */
  securityNotice: string | null;
}

export interface AuthErrorResponse {
  success: false;
  code: AuthErrorCode;
  message: string;
  /** Present on RATE_LIMITED responses. */
  rateLimit?: RateLimitState;
  /** Field-level validation errors keyed by request field name. */
  fieldErrors?: Partial<Record<string, string>>;
}

export type AuthResponse = AuthSuccessResponse | AuthErrorResponse | ThrottledAuthResponse;

export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_NOT_FOUND'
  | 'EMAIL_NOT_VERIFIED'
  | 'RATE_LIMITED'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'SESSION_RISK_HIGH'
  | 'VALIDATION_ERROR'
  | 'SERVER_ERROR';

/** Returns true when the cooldown window has passed. Pure, testable. */
export function isCooldownExpired(cooldownUntil: string | null): boolean {
  if (!cooldownUntil) return true;
  return new Date(cooldownUntil).getTime() < Date.now();
}

/** Seconds remaining in the cooldown window, or 0 if not locked. */
export function cooldownSecondsRemaining(cooldownUntil: string | null): number {
  if (!cooldownUntil) return 0;
  const remaining = Math.ceil((new Date(cooldownUntil).getTime() - Date.now()) / 1000);
  return Math.max(0, remaining);
}