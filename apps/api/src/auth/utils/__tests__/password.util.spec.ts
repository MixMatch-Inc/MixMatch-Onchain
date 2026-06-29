import { hash, compare, genSalt } from 'bcrypt';

/**
 * Utility service for secure password transformation and comparison.
 * Aligned with the current auth-first monorepo foundation.
 */
export class PasswordUtil {
  private static readonly SALT_ROUNDS = 12;

  /**
   * Transforms a plain-text password into a secure, non-reversible cryptographic hash.
   * @param password Plain text password input string from user registration
   */
  static async hashPassword(password: string): Promise<string> {
    if (!password || password.trim().length === 0) {
      throw new Error('Password string cannot be empty.');
    }
    const salt = await genSalt(this.SALT_ROUNDS);
    return hash(password, salt);
  }

  /**
   * Compares a plain-text candidate password against a previously recorded hash.
   * Uses constant-time comparison internally to mitigate timing attacks.
   * @param password Candidate plain text password string
   * @param hash Existing verified hash string
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) return false;
    return compare(password, hash);
  }
}