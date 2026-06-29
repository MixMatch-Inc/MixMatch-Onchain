import { describe, expect, it } from 'vitest';
import { InvalidRefreshTokenError } from '../../../shared/errors/AuthErrors.js';
import { InMemorySessionStore } from '../session.store.js';
import { SessionService } from '../session.service.js';

function createSessionService(): SessionService {
  return new SessionService(new InMemorySessionStore());
}

describe('SessionService', () => {
  describe('createSession', () => {
    it('returns a token pair with access and refresh tokens', async () => {
      const service = createSessionService();
      const result = await service.createSession('user-1');

      expect(typeof result.accessToken).toBe('string');
      expect(result.accessToken.split('.').length).toBe(3);
      expect(typeof result.refreshToken).toBe('string');
      expect(result.refreshToken.length).toBeGreaterThan(10);
    });
  });

  describe('refreshSession', () => {
    it('returns a new token pair for a valid refresh token', async () => {
      const service = createSessionService();
      const initial = await service.createSession('user-1');

      const refreshed = await service.refreshSession(initial.refreshToken);

      expect(typeof refreshed.accessToken).toBe('string');
      expect(typeof refreshed.refreshToken).toBe('string');
      expect(refreshed.refreshToken).not.toBe(initial.refreshToken);
    });

    it('rejects a revoked refresh token', async () => {
      const service = createSessionService();
      const initial = await service.createSession('user-1');

      await service.revokeSession(initial.refreshToken);

      await expect(service.refreshSession(initial.refreshToken)).rejects.toThrow(InvalidRefreshTokenError);
    });

    it('rejects a tampered refresh token', async () => {
      const service = createSessionService();
      await service.createSession('user-1');

      await expect(service.refreshSession('this-is-a-tampered-token')).rejects.toThrow(
        InvalidRefreshTokenError,
      );
    });

    it('rejects an empty refresh token', async () => {
      const service = createSessionService();

      await expect(service.refreshSession('')).rejects.toThrow(InvalidRefreshTokenError);
    });
  });

  describe('revokeSession', () => {
    it('revokes a session by refresh token', async () => {
      const service = createSessionService();
      const initial = await service.createSession('user-1');

      await service.revokeSession(initial.refreshToken);

      await expect(service.refreshSession(initial.refreshToken)).rejects.toThrow(InvalidRefreshTokenError);
    });

    it('throws when trying to revoke an already revoked token', async () => {
      const service = createSessionService();
      const initial = await service.createSession('user-1');

      await service.revokeSession(initial.refreshToken);

      await expect(service.revokeSession(initial.refreshToken)).rejects.toThrow(InvalidRefreshTokenError);
    });
  });

  describe('revokeAllUserSessions', () => {
    it('revokes all sessions for a user', async () => {
      const service = createSessionService();
      const session1 = await service.createSession('user-1');
      const session2 = await service.createSession('user-1');

      await service.revokeAllUserSessions('user-1');

      await expect(service.refreshSession(session1.refreshToken)).rejects.toThrow(InvalidRefreshTokenError);
      await expect(service.refreshSession(session2.refreshToken)).rejects.toThrow(InvalidRefreshTokenError);
    });

    it('does not affect sessions of other users', async () => {
      const service = createSessionService();
      const user1Session = await service.createSession('user-1');
      const user2Session = await service.createSession('user-2');

      await service.revokeAllUserSessions('user-1');

      const refreshed = await service.refreshSession(user2Session.refreshToken);
      expect(typeof refreshed.accessToken).toBe('string');
    });
  });

  describe('max concurrent sessions', () => {
    it('allows up to 5 sessions per user', async () => {
      const service = createSessionService();
      const tokens: string[] = [];
      for (let i = 0; i < 5; i++) {
        const result = await service.createSession('user-1');
        tokens.push(result.refreshToken);
      }
      expect(tokens.length).toBe(5);
    });

    it('rejects a 6th session beyond the limit', async () => {
      const service = createSessionService();
      for (let i = 0; i < 5; i++) {
        await service.createSession('user-1');
      }

      await expect(service.createSession('user-1')).rejects.toThrow(InvalidRefreshTokenError);
    });

    it('allows a new session after revoking one', async () => {
      const service = createSessionService();
      const sessions: Array<{ refreshToken: string }> = [];
      for (let i = 0; i < 5; i++) {
        sessions.push(await service.createSession('user-1'));
      }

      await service.revokeSession(sessions[0].refreshToken);
      const result = await service.createSession('user-1');

      expect(typeof result.accessToken).toBe('string');
    });
  });
});
