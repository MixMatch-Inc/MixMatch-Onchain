import { describe, expect, it } from 'vitest';
import type { Session, SessionConfig, TokenPair } from '../types/session.js';

describe('Session interface contract', () => {
  it('conforms to the expected shape', () => {
    const session: Session = {
      id: 'uuid-1',
      userId: 'user-1',
      refreshToken: 'rt-1',
      expiresAt: '2025-12-31T00:00:00.000Z',
      createdAt: '2025-01-01T00:00:00.000Z',
    };
    expect(session.id).toBeDefined();
    expect(session.userId).toBeDefined();
    expect(session.refreshToken).toBeDefined();
    expect(session.expiresAt).toBeDefined();
    expect(session.createdAt).toBeDefined();
  });
});

describe('TokenPair interface contract', () => {
  it('holds an access token and a refresh token', () => {
    const pair: TokenPair = { accessToken: 'at-1', refreshToken: 'rt-1' };
    expect(pair.accessToken).toBe('at-1');
    expect(pair.refreshToken).toBe('rt-1');
  });
});

describe('SessionConfig interface contract', () => {
  it('holds refresh token expiry and max active sessions', () => {
    const config: SessionConfig = {
      refreshTokenExpiryMs: 7 * 24 * 60 * 60 * 1000,
      maxActiveSessions: 5,
    };
    expect(config.refreshTokenExpiryMs).toBe(604800000);
    expect(config.maxActiveSessions).toBe(5);
  });
});
