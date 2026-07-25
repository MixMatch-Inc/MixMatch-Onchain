/**
 * Login Flow — Scope & Contracts
 *
 * Track: login flow | signup flow  |  Sprint 1
 *
 * Defines the complete boundary for the login/signup authentication flows:
 * request shapes, response shapes, error codes, and the accepted edge cases.
 * This file is the single source of truth for what "login complete" means.
 */

// ---------------------------------------------------------------------------
// Request contracts
// ---------------------------------------------------------------------------

/** Validated by loginSchema in packages/shared/src/validation/auth.schema.ts */
export interface LoginRequest {
  email: string;     // non-empty, valid email format
  password: string;  // non-empty, min length 1
}

/** Validated by registerSchema in packages/shared/src/validation/auth.schema.ts */
export interface RegisterRequest {
  email: string;     // non-empty, valid email format
  password: string;  // min 8 characters, max 128 characters
}

// ---------------------------------------------------------------------------
// Success response contracts
// ---------------------------------------------------------------------------

/** Returned by POST /api/auth/login on success (HTTP 200) */
export interface LoginSuccessResponse {
  user: {
    id: string;
    email: string;
    role: string;
    createdAt: string;  // ISO 8601
    updatedAt: string;  // ISO 8601
    // passwordHash MUST NOT be present
  };
  accessToken: string;   // JWT, short-lived
  refreshToken: string;  // opaque UUID, long-lived
}

/** Returned by POST /api/auth/register on success (HTTP 201) */
export type RegisterSuccessResponse = LoginSuccessResponse;

// ---------------------------------------------------------------------------
// Error response contracts
// ---------------------------------------------------------------------------

export type LoginErrorCode =
  | "VALIDATION_ERROR"    // 400 — malformed request body
  | "UNAUTHORIZED"        // 401 — wrong email or password
  | "RATE_LIMITED"        // 429 — too many failed attempts
  | "CONFLICT";           // 409 — email already registered (register only)

export interface AuthErrorResponse {
  error: {
    code: LoginErrorCode;
    message: string;
    /** Only present on 429 responses */
    retryAfter?: number;
  };
}

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

/**
 * Edge cases that MUST be handled by the login and signup flows:
 *
 * | Input                         | Login | Register | Notes                              |
 * |-------------------------------|-------|----------|------------------------------------|
 * | Non-existent email            | 401   | —        | same message as wrong password     |
 * | Wrong password                | 401   | —        | same message as non-existent email |
 * | Duplicate email               | —     | 409      | CONFLICT error code                |
 * | Empty password                | 400   | 400      | VALIDATION_ERROR                   |
 * | Password < 8 chars (register) | —     | 400      | VALIDATION_ERROR                   |
 * | Invalid email format          | 400   | 400      | VALIDATION_ERROR                   |
 * | > 5 failed login attempts     | 429   | —        | RATE_LIMITED with retryAfter       |
 * | Missing request body          | 400   | 400      | VALIDATION_ERROR                   |
 *
 * The same error message is returned for "email not found" and "wrong
 * password" to prevent user enumeration attacks.
 */
export type LoginEdgeCases = true; // marker — see apps/api/src/modules/auth/tests/
