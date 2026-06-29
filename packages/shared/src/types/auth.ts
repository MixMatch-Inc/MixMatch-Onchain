/**
 * Shared authentication types used across the API, web, and mobile apps.
 */

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterInput {
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthTokenResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

/**
 * Response shape for GET /api/auth/me.
 * Returns the authenticated user's profile data.
 */
export interface MeResponse {
  user: AuthUser;
}
