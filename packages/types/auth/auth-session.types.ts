export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}