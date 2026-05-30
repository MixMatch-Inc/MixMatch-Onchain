// ---------------------------------------------------------------------------
// API response envelope types (shared across API / web / mobile / Stellar)
// ---------------------------------------------------------------------------

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  code: string;
  message: string;
  details?: unknown;
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiError;

export type ApiResponse<T> = ApiEnvelope<T>;

// ---------------------------------------------------------------------------
// Auth domain types
// ---------------------------------------------------------------------------

export enum UserRole {
  DJ = "DJ",
  PLANNER = "PLANNER",
  MUSIC_LOVER = "MUSIC_LOVER",
};

export interface SignupRequest {
  email: string;
  password: string;
  role: UserRole.DJ | UserRole.PLANNER | UserRole.MUSIC_LOVER;
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

export interface SessionBootstrap {
  userId: string;
  role: UserRole;
  onboardingCompleted: boolean;
  issuedAt: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUserPayload;
}

export interface SignupResponseData extends AuthResponse {
  session: SessionBootstrap;
}

export type SignupResponse = ApiEnvelope<SignupResponseData>;

export interface AuthSession extends SignupResponseData {}

// ---------------------------------------------------------------------------
// Login types (shared across API / web / mobile)
// ---------------------------------------------------------------------------

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponseData extends AuthResponse {
  session: SessionBootstrap;
}

export type LoginResponse = ApiEnvelope<LoginResponseData>;

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

// ---------------------------------------------------------------------------
// Stellar-boundary auth types (auth-to-Stellar handoff)
// ---------------------------------------------------------------------------

export interface StellarAuthRequest {
  sessionToken: string;
  stellarPublicKey: string;
}

export interface StellarAuthResponseData {
  verified: boolean;
  stellarAccountId: string;
  linkedAt: string;
}

export type StellarAuthResponse = ApiEnvelope<StellarAuthResponseData>;

export interface StellarChallengeRequest {
  stellarPublicKey: string;
}

export interface StellarChallengeResponseData {
  transactionXdr: string;
  networkPassphrase: string;
  expiresAt: string;
}

export type StellarChallengeResponse = ApiEnvelope<StellarChallengeResponseData>;

export interface StellarSessionContract {
  userId: string;
  stellarPublicKey: string;
  linkedAt: string;
  networkPassphrase: string;
}
