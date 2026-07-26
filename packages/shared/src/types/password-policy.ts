/**
 * Password Handling — Scope & Contracts
 *
 * Track: password handling  |  Sprint 1
 * Issues: #788 (define scope and contracts)
 *
 * Defines the password policy types, validation boundaries, and security
 * contracts for the password handling workstream. This file is the single
 * source of truth for what the API enforces around passwords.
 *
 * Implementation lives in:
 *   apps/api/src/modules/auth/auth.service.ts (hashing, comparison)
 *   packages/shared/src/validation/auth.schema.ts (Zod schemas)
 */

// ---------------------------------------------------------------------------
// Policy constants
// ---------------------------------------------------------------------------

/**
 * Password constraints enforced by the Zod schemas in auth.schema.ts.
 * Any change here must be reflected in the schema and vice versa.
 */
export const PASSWORD_POLICY = {
  /** Minimum length for registration. Login accepts any non-empty string. */
  MIN_LENGTH_REGISTER: 8,
  /** Maximum length for both registration and login (HTTP body limit). */
  MAX_LENGTH: 128,
  /** bcryptjs cost factor used when hashing. */
  BCRYPT_ROUNDS: 10,
} as const;

export type PasswordPolicyConstants = typeof PASSWORD_POLICY;

// ---------------------------------------------------------------------------
// Context-specific contracts
// ---------------------------------------------------------------------------

/**
 * Constraints applied during user registration.
 * Follows NIST SP 800-63B: minimum length, no arbitrary complexity rules.
 */
export interface RegistrationPasswordPolicy {
  /** Minimum number of characters. */
  minLength: typeof PASSWORD_POLICY.MIN_LENGTH_REGISTER;
  /** Maximum number of characters (HTTP body limit). */
  maxLength: typeof PASSWORD_POLICY.MAX_LENGTH;
  /** No uppercase/lowercase/digit/symbol complexity requirements. */
  noComplexityRequirements: true;
  /** Unicode and emoji are accepted. */
  unicodeAccepted: true;
  /** Whitespace is accepted without trimming. */
  whitespaceAccepted: true;
}

/**
 * Constraints applied during login password verification.
 * Intentionally lenient to avoid leaking information about registration policy.
 */
export interface LoginPasswordPolicy {
  /** Must be non-empty (min 1 character). */
  minLength: 1;
  maxLength: typeof PASSWORD_POLICY.MAX_LENGTH;
  noComplexityRequirements: true;
}

// ---------------------------------------------------------------------------
// Security contracts
// ---------------------------------------------------------------------------

/**
 * Security invariants that MUST hold for every password operation:
 *
 * 1. Raw passwords are NEVER stored or logged.
 * 2. Passwords are hashed with bcrypt at cost factor PASSWORD_POLICY.BCRYPT_ROUNDS.
 * 3. The hash is NEVER returned in API responses.
 * 4. Login returns the same error regardless of whether the email exists
 *    or the password is wrong (no user enumeration).
 * 5. Failed login attempts are rate-limited per email address.
 */
export type PasswordSecurityInvariants = true; // marker — see apps/docs/password-handling.md

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

/**
 * Password input edge cases and their expected behaviour:
 *
 * | Input                        | Register   | Login      | Reason                        |
 * |------------------------------|------------|------------|-------------------------------|
 * | Empty string                 | 400        | 400        | Fails min(1) check            |
 * | 7 characters                 | 400        | Accepted   | Below register min(8)         |
 * | Exactly 8 characters         | Accepted   | Accepted   | Boundary of register min      |
 * | Whitespace-only (8+ chars)   | Accepted   | Accepted   | No trim on server side        |
 * | Leading/trailing whitespace  | Accepted   | Accepted   | Not trimmed (security choice) |
 * | Unicode / emoji              | Accepted   | Accepted   | No charset restrictions       |
 * | Special characters (\!@#$)    | Accepted   | Accepted   | No charset restrictions       |
 * | > 128 characters             | 400        | 400        | Exceeds MAX_LENGTH            |
 */
export type PasswordEdgeCases = true; // marker — see apps/api/src/modules/auth/tests/
