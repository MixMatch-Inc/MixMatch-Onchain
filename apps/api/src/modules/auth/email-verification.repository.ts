import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, lt, or } from 'drizzle-orm';
import { DATABASE } from '../../db/db.module';
import * as schema from '../../db/schema';
import type { Database } from '../../db/client';

export interface EmailVerificationTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class EmailVerificationRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async create(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<EmailVerificationTokenRecord> {
    const [row] = await this.db
      .insert(schema.emailVerificationTokens)
      .values(input)
      .returning();
    if (!row) {
      throw new Error('Failed to create email verification token');
    }
    return row;
  }

  /** Looks a token up by hash — the plaintext is never stored. */
  async findByTokenHash(
    tokenHash: string,
  ): Promise<EmailVerificationTokenRecord | null> {
    const [row] = await this.db
      .select()
      .from(schema.emailVerificationTokens)
      .where(eq(schema.emailVerificationTokens.tokenHash, tokenHash))
      .limit(1);
    return row ?? null;
  }

  /**
   * Marks a token used, but only if it is still unused — the `isNull`
   * predicate makes redemption atomic, so two concurrent requests carrying
   * the same token can't both succeed. Returns false if it was already spent.
   */
  async consume(id: string): Promise<boolean> {
    const rows = await this.db
      .update(schema.emailVerificationTokens)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(schema.emailVerificationTokens.id, id),
          isNull(schema.emailVerificationTokens.consumedAt),
        ),
      )
      .returning({ id: schema.emailVerificationTokens.id });
    return rows.length > 0;
  }

  /**
   * Clears a user's outstanding tokens before a new one is issued, so a
   * resend invalidates the previous link rather than leaving several live
   * at once. Also sweeps that user's expired rows.
   */
  async deleteOutstandingForUser(userId: string): Promise<void> {
    await this.db
      .delete(schema.emailVerificationTokens)
      .where(
        and(
          eq(schema.emailVerificationTokens.userId, userId),
          or(
            isNull(schema.emailVerificationTokens.consumedAt),
            lt(schema.emailVerificationTokens.expiresAt, new Date()),
          ),
        ),
      );
  }
}
