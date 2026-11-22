/**
 * Shared authentication types used across the API, web, and mobile apps.
 */

export type UserRole = 'USER' | 'ADMIN' | 'ARBITER';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  emailVerifiedAt?: string | null;
}

export interface AuthTokenResponse {
  user: AuthUser;
  accessToken: string;
}

export interface MeResponse {
  user: AuthUser;
}
