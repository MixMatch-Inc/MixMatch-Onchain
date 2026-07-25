import { describe, expect, it } from "vitest";
import { InvalidRefreshTokenError } from "../../../shared/errors/AuthErrors.js";
import { InMemorySessionStore } from "../session.store.js";
import { SessionService } from "../session.service.js";

/**
 * Session lifecycle — core flow implementation, hardened edge cases.
 *
 * Track: session lifecycle | auth guard  |  Sprint 1
 * Issues: #684 (implement), #686 (harden)
 *
 * Extends the existing session.test.ts with edge cases documented in
 * packages/shared/src/types/session-lifecycle.ts.
 */

function makeService(): SessionService {
  return new SessionService(new InMemorySessionStore());
}

describe("Session lifecycle — core flow (issue #684)", () => {
  it("access token is a valid 3-part JWT string", async () => {
    const service = makeService();
    const { accessToken } = await service.createSession("user-1");
    const parts = accessToken.split(".");
    expect(parts).toHaveLength(3);
    // Each part is non-empty base64url
    for (const part of parts) {
      expect(part.length).toBeGreaterThan(0);
    }
  });

  it("refresh token is an opaque non-JWT string (no dots)", async () => {
    const service = makeService();
    const { refreshToken } = await service.createSession("user-1");
    // UUIDs have hyphens but no dots — confirm it is not mistaken for a JWT
    expect(refreshToken.split(".")).toHaveLength(1);
    expect(refreshToken.length).toBeGreaterThan(10);
  });

  it("two sessions for the same user produce different token pairs", async () => {
    const service = makeService();
    const s1 = await service.createSession("user-1");
    const s2 = await service.createSession("user-1");
    expect(s1.accessToken).not.toBe(s2.accessToken);
    expect(s1.refreshToken).not.toBe(s2.refreshToken);
  });

  it("refresh rotates the refresh token (old token is single-use)", async () => {
    const service = makeService();
    const initial = await service.createSession("user-1");
    const rotated = await service.refreshSession(initial.refreshToken);

    expect(rotated.refreshToken).not.toBe(initial.refreshToken);

    // Old refresh token must now be invalid
    await expect(service.refreshSession(initial.refreshToken)).rejects.toThrow(
      InvalidRefreshTokenError,
    );
  });

  it("refreshed access token is a valid JWT", async () => {
    const service = makeService();
    const { refreshToken } = await service.createSession("user-1");
    const { accessToken } = await service.refreshSession(refreshToken);
    expect(accessToken.split(".")).toHaveLength(3);
  });
});

describe("Session lifecycle — hardened edge cases (issue #686)", () => {
  it("rejects a JWT access token passed as a refresh token", async () => {
    const service = makeService();
    const { accessToken } = await service.createSession("user-1");
    // Passing the access token where a refresh token is expected must fail
    await expect(service.refreshSession(accessToken)).rejects.toThrow(
      InvalidRefreshTokenError,
    );
  });

  it("rejects a UUID-shaped but nonexistent refresh token", async () => {
    const service = makeService();
    const fakeUUID = "00000000-0000-0000-0000-000000000000";
    await expect(service.refreshSession(fakeUUID)).rejects.toThrow(
      InvalidRefreshTokenError,
    );
  });

  it("refresh is idempotent-resistant: second use of same token fails", async () => {
    const service = makeService();
    const { refreshToken } = await service.createSession("user-1");
    await service.refreshSession(refreshToken);
    await expect(service.refreshSession(refreshToken)).rejects.toThrow(
      InvalidRefreshTokenError,
    );
  });

  it("revoking a session makes its refresh token immediately unusable", async () => {
    const service = makeService();
    const { refreshToken } = await service.createSession("user-1");
    await service.revokeSession(refreshToken);
    await expect(service.refreshSession(refreshToken)).rejects.toThrow(
      InvalidRefreshTokenError,
    );
  });

  it("revoking all user sessions does not affect other users", async () => {
    const service = makeService();
    await service.createSession("user-a");
    const userB = await service.createSession("user-b");

    await service.revokeAllUserSessions("user-a");

    // user-b session must still be usable
    const refreshed = await service.refreshSession(userB.refreshToken);
    expect(typeof refreshed.accessToken).toBe("string");
  });

  it("enforces max sessions and allows a new session after one is revoked", async () => {
    const service = makeService();
    const sessions: Array<{ refreshToken: string }> = [];
    for (let i = 0; i < 5; i++) {
      sessions.push(await service.createSession("user-1"));
    }

    // 6th session should be rejected
    await expect(service.createSession("user-1")).rejects.toThrow(
      InvalidRefreshTokenError,
    );

    // After revoking one, a new session should be allowed
    await service.revokeSession(sessions[0]!.refreshToken);
    const newSession = await service.createSession("user-1");
    expect(typeof newSession.refreshToken).toBe("string");
  });

  it("revokeAllUserSessions on a user with no sessions is a no-op", async () => {
    const service = makeService();
    // Must not throw for a user with no sessions
    await expect(
      service.revokeAllUserSessions("user-with-no-sessions"),
    ).resolves.not.toThrow();
  });
});
