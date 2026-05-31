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
export type LoginResponse = ApiResponse<SignupResponseData>;

export type AuthSession = SignupResponseData;

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
