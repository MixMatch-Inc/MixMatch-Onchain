import { IEmailVerificationToken } from '@mixmatch/types';

export interface IEmailVerificationTokenRepository {
  /** Persist a new token record. */
  create(data: Omit<IEmailVerificationToken, 'id' | 'createdAt'>): Promise<IEmailVerificationToken>;

  /**
   * Find the most recent token for a user that is neither consumed,
   * superseded, nor expired. Returns null if none exists.
   */
  findActiveByUserId(userId: string): Promise<IEmailVerificationToken | null>;

  /** Look up a token by its SHA-256 hash (used during confirmation). */
  findByTokenHash(hash: string): Promise<IEmailVerificationToken | null>;

  /** Mark a token as consumed (single-use enforcement). */
  markConsumed(id: string): Promise<void>;

  /**
   * Supersede every live (non-consumed, non-superseded, non-expired) token
   * for this user, except the one with `exceptId`.
   * Returns the number of documents updated.
   */
  supersedePriorTokens(userId: string, exceptId: string): Promise<number>;

  /**
   * Count tokens created for a user within the last `windowMs` milliseconds.
   * Used for resend rate-limiting.
   */
  countRecentByUserId(userId: string, windowMs: number): Promise<number>;
}
