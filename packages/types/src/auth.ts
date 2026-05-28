import { UserRole } from "./index";

/** POST /auth/register – request body */
export interface SignupRequest {
  email: string;
  password: string;
  role: UserRole.DJ | UserRole.PLANNER | UserRole.MUSIC_LOVER;
}

/** Minimal user shape returned after auth actions */
export interface AuthUserPayload {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  onboardingCompleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Envelope returned by register and login */
export interface AuthResponse {
  token: string;
  user: AuthUserPayload;
}

/** Generic API success envelope */
export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
}

/** Generic API error envelope */
export interface ApiError {
  success: false;
  code: string;
  message: string;
}

/** First-session bootstrap payload – sent once after registration */
export interface SessionBootstrap {
  userId: string;
  role: UserRole;
  onboardingCompleted: boolean;
  /** ISO timestamp of session creation */
  issuedAt: string;
}

/** Union of all auth-related response shapes */
export type AuthEnvelope =
  | ApiSuccess<AuthResponse>
  | ApiSuccess<SessionBootstrap>
  | ApiError;
