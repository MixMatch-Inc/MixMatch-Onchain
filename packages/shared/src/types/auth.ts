/**
 * Shared authentication types used across the API, web, and mobile apps.
 */

export type UserRole = 'USER' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  /**
   * Whether the address has been confirmed. Only gates sign-in where the
   * API sets EMAIL_VERIFICATION_REQUIRED; elsewhere it is informational.
   */
  emailVerified: boolean;
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

/**
 * Returned by `POST /auth/register` when the API requires a confirmed email
 * address. No access token is issued: the account cannot be used until
 * `POST /auth/verify-email` is called with the token emailed to the address.
 *
 * Discriminate against `AuthTokenResponse` on `accessToken`, which is null
 * here and a string there.
 */
export interface PendingEmailVerificationResponse {
  user: AuthUser;
  accessToken: null;
  /**
   * The verification token, returned inline **only** outside production so
   * local development can complete the flow without a mail transport. Never
   * present in production, where the token only reaches the user by email.
   */
  verificationToken?: string;
}

/**
 * `POST /auth/register` either signs the user straight in (the default) or,
 * where email verification is required, returns a pending response with no
 * token.
 */
export type RegisterResponse =
  | AuthTokenResponse
  | PendingEmailVerificationResponse;

/** `POST /auth/verify-email` — the account is usable from here on. */
export interface VerifyEmailResponse {
  user: AuthUser;
}

/**
 * `POST /auth/sse-token` — a short-lived, single-use token for the
 * `GET /payments/stream` SSE endpoint's `?token=` query param. Mint a fresh
 * one for every stream connection: it is rejected on second use, and is not
 * accepted as an `Authorization` header bearer token.
 */
export interface SseTokenResponse {
  token: string;
  expiresInSeconds: number;
}
