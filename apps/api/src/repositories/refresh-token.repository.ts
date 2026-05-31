import type { RefreshTokenRecord } from "@themixmatch/types";

/**
 * In-memory refresh token store.
 * Swap this for a Redis or DB-backed store in a later milestone without
 * changing the interface — callers depend only on the exported object shape.
 */

const tokens = new Map<string, RefreshTokenRecord>();

export const refreshTokenRepository = {
  /** Persist a newly-issued refresh token record. */
  async save(record: RefreshTokenRecord): Promise<void> {
    tokens.set(record.jti, record);
  },

  /** Look up a token by its jti. Returns null if not found. */
  async findByJti(jti: string): Promise<RefreshTokenRecord | null> {
    return tokens.get(jti) ?? null;
  },

  /** Mark a token as revoked (single-use enforcement). */
  async revoke(jti: string): Promise<void> {
    const record = tokens.get(jti);
    if (record) {
      tokens.set(jti, { ...record, revoked: true });
    }
  },

  /** Revoke all tokens belonging to a user (e.g. on logout or password change). */
  async revokeAllForUser(userId: string): Promise<void> {
    for (const [jti, record] of tokens.entries()) {
      if (record.userId === userId) {
        tokens.set(jti, { ...record, revoked: true });
      }
    }
  },
};
