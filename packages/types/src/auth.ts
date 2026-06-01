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

/**
 * User profile included in auth responses.
 *
 * Ownership semantics:
 * - `id`: Immutable user identifier; must be preserved across refresh and recovery flows
 * - `role`: User's authorization level; must be consistent across token rotations
 * - All fields are read-only from client perspective (set by API only)
 */
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

/**
 * Session metadata bootstrapped on login/signup and preserved through recovery.
 *
 * Ownership semantics (AUTH-062):
 * - `userId`: Source of truth for session ownership; must match JWT claims at all boundaries
 * - `role`: Mirrors user role for client-side authorization decisions
 * - `wallet`: Stellar service endpoint configuration; preserved across token refresh
 *
 * Recovery guarantees:
 * - All fields are preserved when client calls refresh endpoint with valid refresh token
 * - Clients must reject sessions where SessionBootstrap.userId differs from AuthUserPayload.id
 */
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

// ── Session refresh ──────────────────────────────────────────────────────────

/**
 * JWT payload decoded from refresh token (server-side only).
 *
 * Ownership & recovery semantics (AUTH-062):
 * - `userId`: Must match the user record in refresh token store (ownership boundary)
 * - `jti`: Unique token identifier enabling single-use enforcement
 *   - On refresh: old jti is revoked, new jti is issued
 *   - Prevents token replay attacks and enforces family rotation
 * - `role`: Included in JWT for efficiency; server must re-verify at boundaries
 *
 * Recovery flow:
 * 1. Client POST /refresh with old refresh token
 * 2. Server verifies JWT signature and decodes userId + jti
 * 3. Server fetches token record by jti from store
 * 4. Server verifies: userId in JWT == userId in record (ownership check)
 * 5. Server verifies: record.revoked == false (single-use check)
 * 6. Server revokes old jti
 * 7. Server issues new access + refresh token pair with new jti
 */
export interface RefreshTokenPayload {
  userId: string;
  role: UserRole;
  /** jti — unique token id used for single-use enforcement */
  jti: string;
}

export interface SessionRefreshRequest {
  refreshToken: string;
}

/**
 * Refreshed token pair returned after successful POST /refresh.
 *
 * Recovery semantics (AUTH-062):
 * - Both tokens are new (single-use enforcement; old tokens are revoked)
 * - Ownership: new tokens belong to the same user as the refresh request
 * - Clients must update stored session with both tokens
 * - `expiresAt`: Describes the new access token's lifetime (15 minutes default)
 *
 * Metadata preservation:
 * - User ID, role, onboarding status, and wallet config must be preserved by client
 * - (API does not re-send AuthUserPayload or SessionBootstrap on refresh)
 */
export interface SessionRefreshResponse {
  accessToken: string;
  refreshToken: string;
  /** ISO-8601 expiry of the new access token */
  expiresAt: string;
}

// ── Introspection ────────────────────────────────────────────────────────────

/**
 * Token introspection response — ownership audit trail and recovery decision point.
 *
 * Ownership semantics (AUTH-063):
 * - `valid`: Whether the token passes signature and lifetime checks
 * - `userId`: Provided only when valid; enables client-side ownership verification
 * - `role`: Provided only when valid; used for client-side authorization decisions
 * - `expiresAt`: Provided only when valid; enables client-side refresh scheduling
 *
 * Security notes:
 * - userId is always omitted when valid=false (no user enumeration)
 * - Clients use this to validate stored sessions on app boot
 * - Recovery: if valid=false but refreshToken exists, client should attempt POST /refresh
 */
export interface IntrospectResponse {
  valid: boolean;
  userId?: string;
  role?: UserRole;
  /** ISO-8601 expiry of the access token */
  expiresAt?: string;
}

// ── Protected session types (AUTH-061) ─────────────────────────────────────────

/**
 * Result of validating a stored session.
 * Used by clients to determine if a session is usable without introspecting the server.
 */
export interface ProtectedSession {
  isValid: boolean;
  needsRefresh: boolean;
  userId?: string;
  role?: UserRole;
  /** ISO-8601 expiry of the access token */
  expiresAt?: string;
  /** Refresh token for obtaining a new access token */
  refreshToken?: string;
}

export interface ValidateSessionRequest {
  accessToken: string;
}

export type ValidateSessionResponse = ApiResponse<ProtectedSession>;

// ── Credential errors ────────────────────────────────────────────────────────

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

// ── Session logout ───────────────────────────────────────────────────────────

export interface SessionLogoutRequest {
  refreshToken: string;
}

/**
 * Response after POST /logout — refresh token revocation confirmation.
 *
 * Ownership semantics (AUTH-064):
 * - Idempotent: loggedOut=true even if token was already revoked or invalid
 * - Server revokes the refresh token jti to prevent reuse
 * - Clients must clear all session storage after receiving loggedOut=true
 * - Enables multi-device logout: each device has its own refresh token
 */
export interface SessionLogoutResponse {
  loggedOut: boolean;
}

// ── Route guard context ────────────────────────────────────────────────────────

/** Claims attached to protected routes after access-token verification. */
export interface AuthenticatedRequestContext {
  userId: string;
  role: UserRole;
}

/**
 * Client-side outcome when restoring or validating a stored session.
 *
 * Recovery semantics (AUTH-063):
 * - `valid`: Stored session token passed introspection; no API calls needed
 * - `refreshed`: Stored session token expired; client called /refresh and succeeded
 * - `expired`: Token invalid and refresh failed or unavailable; client must re-authenticate
 *
 * Ownership invariant:
 * - Both `valid` and `refreshed` outcomes preserve the original AuthSession with updated tokens
 * - userId, user metadata, and wallet config are immutable across outcomes
 */
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
