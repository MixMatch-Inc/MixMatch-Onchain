/**
 * Shared authentication types used across the API, web, and mobile apps.
 */

export interface AuthUser {
  id: string;
  email: string;
<<<<<<< HEAD
=======
  role: string;
>>>>>>> pr647/feat/phertyameen-issues
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
}
