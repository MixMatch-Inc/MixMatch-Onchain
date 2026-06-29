import type { Session, SessionConfig, TokenPair } from '@mixmatch/shared';

export type { Session, SessionConfig, TokenPair };

export const SESSION_CONFIG: SessionConfig = {
  refreshTokenExpiryMs: 7 * 24 * 60 * 60 * 1000,
  maxActiveSessions: 5,
};
