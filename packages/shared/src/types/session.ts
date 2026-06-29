/**
 * Shared session types used across the API, web, and mobile apps.
 */

export interface Session {
  id: string;
  userId: string;
  refreshToken: string;
  expiresAt: string;
  createdAt: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface SessionConfig {
  refreshTokenExpiryMs: number;
  maxActiveSessions: number;
}
