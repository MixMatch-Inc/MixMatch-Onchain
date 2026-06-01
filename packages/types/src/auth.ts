import type { ApiResponse } from "./auth-envelope.types.js";

export enum UserRole {
  DJ = "DJ",
  PLANNER = "PLANNER",
  MUSIC_LOVER = "MUSIC_LOVER",
}

export interface SignupRequest {
  email: string;
  password: string;
  role: UserRole.DJ | UserRole.PLANNER | UserRole.MUSIC_LOVER;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUserPayload {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  onboardingCompleted: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface WalletBootstrap {
  service: "stellar-service";
  status: "unlinked" | "pending" | "linked";
  networkPassphrase: string;
  horizonUrl: string;
  availableWallets: string[];
}

export interface SessionBootstrap {
  userId: string;
  role: UserRole;
  onboardingCompleted: boolean;
  issuedAt: string;
  wallet: WalletBootstrap;
}

export interface AuthResponse {
  token: string;
  /** Refresh token issued alongside the access token */
  refreshToken: string;
  user: AuthUserPayload;
}

export interface SignupResponseData extends AuthResponse {
  session: SessionBootstrap;
}

export type SignupResponse = ApiResponse<SignupResponseData>;
export type AuthSession = SignupResponseData;

// ── Login types ──────────────────────────────────────────────────────────────

export interface LoginResponseData extends AuthResponse {
  session: SessionBootstrap;
}

export type LoginResponse = ApiResponse<LoginResponseData>;

export enum CredentialErrorCode {
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  ACCOUNT_NOT_FOUND = "ACCOUNT_NOT_FOUND",
  ACCOUNT_LOCKED = "ACCOUNT_LOCKED",
}

export interface CredentialErrorContract {
  code: CredentialErrorCode;
  message: string;
  retryAfter?: number;
}

// ── Session refresh ──────────────────────────────────────────────────────────

export interface RefreshTokenPayload {
  userId: string;
  role: UserRole;
  /** jti — unique token id used for single-use enforcement */
  jti: string;
}

export interface SessionRefreshRequest {
  refreshToken: string;
}

export interface SessionRefreshResponse {
  accessToken: string;
  refreshToken: string;
  /** ISO-8601 expiry of the new access token */
  expiresAt: string;
}

// ── Introspection ────────────────────────────────────────────────────────────

export interface IntrospectResponse {
  valid: boolean;
  userId?: string;
  role?: UserRole;
  /** ISO-8601 expiry of the access token */
  expiresAt?: string;
}

// ── Session logout ───────────────────────────────────────────────────────────

export interface SessionLogoutRequest {
  refreshToken: string;
}

export interface SessionLogoutResponse {
  loggedOut: boolean;
}

// ── Route guard context ────────────────────────────────────────────────────────

/** Claims attached to protected routes after access-token verification. */
export interface AuthenticatedRequestContext {
  userId: string;
  role: UserRole;
}

/** Client-side outcome when restoring or validating a stored session. */
export type SessionContinuityOutcome =
  | { status: "valid"; session: AuthSession }
  | { status: "refreshed"; session: AuthSession }
  | { status: "expired" };

// ── Stellar auth boundary (auth-to-Stellar handoff) ───────────────────────────

export interface StellarAuthChallengeRequest {
  stellarPublicKey: string;
}

export interface StellarAuthChallengeResponse {
  transactionXdr: string;
  networkPassphrase: string;
  expiresAt: string;
}

export interface StellarAuthVerifyRequest {
  sessionToken: string;
  stellarPublicKey: string;
}

export interface StellarAuthVerifyResponse {
  verified: boolean;
  stellarAccountId: string;
  linkedAt: string;
}

export type StellarAuthChallengeApiResponse = ApiResponse<StellarAuthChallengeResponse>;
export type StellarAuthVerifyApiResponse = ApiResponse<StellarAuthVerifyResponse>;
export type SessionRefreshApiResponse = ApiResponse<SessionRefreshResponse>;
export type SessionLogoutApiResponse = ApiResponse<SessionLogoutResponse>;
export type IntrospectApiResponse = ApiResponse<IntrospectResponse>;

// ── Auth abuse-control shared contracts (AUTH-118–121) ────────────────────────
// These types are shared across apps/api, apps/web, and apps/mobile so that
// all surfaces use the same throttle vocabulary without app-local copies.

/** Returned (or embedded) when a caller is being throttled. */
export interface ThrottleNotice {
  /** Whether the caller is currently throttled. */
  throttled: boolean;
  /** Seconds until the caller may retry — present when `throttled` is true. */
  retryAfter?: number;
  /** Attempts remaining in the current window — present when > 0. */
  attemptsRemaining?: number;
}

/**
 * Machine-readable session risk signal surfaced by the API.
 * Clients present this as a contextual notice rather than a hard error.
 */
export interface SessionRiskNotice {
  /** Why the risk notice was raised. */
  type: "multiple_failures" | "account_cooldown" | "suspicious_activity";
  /** Human-readable explanation suitable for display. */
  message: string;
  /** Suggested follow-up action for the UI. */
  action?: "re_authenticate" | "contact_support" | "wait_and_retry";
}

/** Tracks whether a credential (email) is under an auth abuse cooldown. */
export interface AuthAbuseCooldown {
  /** Whether a cooldown is currently active for this credential. */
  active: boolean;
  /** ISO-8601 timestamp when the cooldown lifts — present when active. */
  resetAt?: string;
  /** Why the cooldown was imposed. */
  reason: "too_many_attempts" | "suspicious_activity";
  /** Failed attempts recorded in the current cooldown window. */
  failedAttempts?: number;
}

/** Unified auth-error envelope used on login/register failure paths. */
export interface AuthFailureEnvelope {
  success: false;
  code: string;
  message: string;
  /** Present when the failure is due to rate limiting. */
  throttle?: ThrottleNotice;
  /** Present when an account-level cooldown is in effect. */
  cooldown?: AuthAbuseCooldown;
  /** Present when a session-risk signal should be surfaced to the user. */
  risk?: SessionRiskNotice;
}
