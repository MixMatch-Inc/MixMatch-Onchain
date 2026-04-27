import { IPasswordResetToken } from '@mixmatch/types';

export interface IPasswordResetTokenRepository {
  /** Persist a new password reset token record. */
  create(data: Omit<IPasswordResetToken, 'id' | 'createdAt'>): Promise<IPasswordResetToken>;

  /**
   * Find the most recent token for a user that is neither consumed nor expired.
   * Returns null if none exists.
   */
  findActiveByUserId(userId: string): Promise<IPasswordResetToken | null>;

  /** Look up a token by its SHA-256 hash (used during confirmation). */
  findByTokenHash(hash: string): Promise<IPasswordResetToken | null>;

  /** Mark a token as consumed (single-use enforcement). */
  markConsumed(id: string): Promise<void>;

  /**
   * Supersede every live (non-consumed, non-expired) token for this user.
   * Returns the number of documents updated.
   */
  supersedePriorTokens(userId: string): Promise<number>;

  /**
   * Count tokens created for a user within the last `windowMs` milliseconds.
   * Used for resend rate-limiting.
   */
  countRecentByUserId(userId: string, windowMs: number): Promise<number>;
}
