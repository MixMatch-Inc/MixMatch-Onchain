import { AppError } from './AppError.js';
import { AuthErrorCode } from '@mixmatch/shared';

export class TokenExpiredError extends AppError {
  constructor(message = 'Token has expired') {
    super(message, 401, AuthErrorCode.TOKEN_EXPIRED);
    this.name = 'TokenExpiredError';
  }
}

export class InvalidTokenError extends AppError {
  constructor(message = 'Invalid token') {
    super(message, 401, AuthErrorCode.INVALID_TOKEN);
    this.name = 'InvalidTokenError';
  }
}

export class SessionExpiredError extends AppError {
  constructor(message = 'Session has expired') {
    super(message, 401, AuthErrorCode.SESSION_EXPIRED);
    this.name = 'SessionExpiredError';
  }
}

export class InsufficientPermissionsError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, AuthErrorCode.INSUFFICIENT_PERMISSIONS);
    this.name = 'InsufficientPermissionsError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, AuthErrorCode.FORBIDDEN);
    this.name = 'ForbiddenError';
  }
}

export class AccountLockedError extends AppError {
  constructor(message = 'Account is locked') {
    super(message, 423, AuthErrorCode.ACCOUNT_LOCKED);
    this.name = 'AccountLockedError';
  }
}

export class SessionNotFoundError extends AppError {
  constructor(message = 'Session not found') {
    super(message, 404, AuthErrorCode.SESSION_NOT_FOUND);
    this.name = 'SessionNotFoundError';
  }
}

export class InvalidRefreshTokenError extends AppError {
  constructor(message = 'Invalid or expired refresh token') {
    super(message, 401, AuthErrorCode.INVALID_REFRESH_TOKEN);
    this.name = 'InvalidRefreshTokenError';
  }
}

export class RateLimitedError extends AppError {
  public readonly retryAfter: number;

  constructor(message = 'Too many requests', retryAfter = 60) {
    super(message, 429, AuthErrorCode.RATE_LIMITED);
    this.name = 'RateLimitedError';
    this.retryAfter = retryAfter;
  }
}
