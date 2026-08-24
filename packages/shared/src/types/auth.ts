/**
 * Shared authentication types used across the API, web, and mobile apps.
 */

export interface AuthUser {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokenResponse {
  user: AuthUser;
  accessToken: string;
}

export interface MeResponse {
  user: AuthUser;
}
