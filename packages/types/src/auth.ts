// ---------------------------------------------------------------------------
// API response envelope types
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
// Login types
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
