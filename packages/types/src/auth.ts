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

// ── Auth abuse controls and audit contracts ───────────────────────────────────

/** Machine-readable event kinds recorded in the auth audit trail. */
export type AuthAuditEventKind =
  | "login_attempt"
  | "login_success"
  | "login_failure"
  | "register_attempt"
  | "register_success"
  | "register_failure"
  | "stellar_challenge"
  | "stellar_verify"
  | "rate_limited"
  | "session_refresh"
  | "logout";

/** Structured audit entry emitted for every auth-boundary event. */
export interface AuthAuditEntry {
  event: AuthAuditEventKind;
  /** Authenticated user id — present after successful login/register. */
  userId?: string;
  /** Request origin for abuse-pattern detection. */
  ip?: string;
  /** ISO-8601 timestamp. */
  timestamp: string;
  /** Route or boundary that produced this entry. */
  boundary?: "api" | "stellar";
  /** Arbitrary event metadata — error codes, key fragments, etc. */
  meta?: Record<string, unknown>;
}

/** Returned when a caller exceeds the configured request limit. */
export interface AuthRateLimitError {
  code: "AUTH_RATE_LIMITED";
  message: string;
  /** Seconds until the caller may retry. */
  retryAfter: number;
}

/** User-facing notice for throttling, session risk, and recovery at the Stellar boundary. */
export interface StellarAuthRiskNotice {
  /** Reason the notice was raised. */
  type: "rate_limited" | "invalid_key" | "service_unavailable" | "session_risk";
  message: string;
  /** Present when `type` is `rate_limited` — seconds to wait before retrying. */
  retryAfter?: number;
  /** Suggested follow-up action for the client UI to present. */
  action?: "retry_later" | "re_authenticate" | "contact_support";
}
