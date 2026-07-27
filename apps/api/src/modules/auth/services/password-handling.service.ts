import * as bcrypt from "bcrypt";

/**
 * Service for securely handling passwords.
 * Integrates bcrypt for secure password hashing and validation.
 */
export const passwordHandlingService = {
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  },

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
