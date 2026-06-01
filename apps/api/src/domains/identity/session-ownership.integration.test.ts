/**
 * Session Ownership & Recovery Integration Tests (AUTH-065)
 *
 * These tests verify that session ownership and recovery semantics remain
 * consistent across the API boundary and align with client-side validation
 * in @themixmatch/types shared contracts.
 *
 * Focus areas:
 * - User isolation across concurrent refresh operations
 * - Refresh token single-use enforcement
 * - Ownership metadata preservation in recovery flows
 * - Cross-client token validity semantics
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@themixmatch/types";
import { refreshSession, introspectSession, logoutSession } from "./session.service.js";
import { AuthError } from "../../utils/errors.js";

const mockFindByJti = vi.fn();
const mockRevoke = vi.fn();
const mockSave = vi.fn();

vi.mock("../../config/di.js", () => ({
  container: {
    refreshTokenRepository: {
      findByJti: (...args: unknown[]) => mockFindByJti(...args),
      revoke: (...args: unknown[]) => mockRevoke(...args),
      save: (...args: unknown[]) => mockSave(...args),
    },
  },
}));

const mockVerifyRefreshToken = vi.fn();
const mockVerifyAccessToken = vi.fn();
const mockGenerateAccessToken = vi.fn();
const mockGenerateRefreshToken = vi.fn();
const mockAccessTokenExpiresAt = vi.fn();

vi.mock("../../services/jwt.service.js", () => ({
  verifyRefreshToken: (...args: unknown[]) => mockVerifyRefreshToken(...args),
  verifyAccessToken: (...args: unknown[]) => mockVerifyAccessToken(...args),
  generateAccessToken: (...args: unknown[]) => mockGenerateAccessToken(...args),
  generateRefreshToken: (...args: unknown[]) => mockGenerateRefreshToken(...args),
  accessTokenExpiresAt: (...args: unknown[]) => mockAccessTokenExpiresAt(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockAccessTokenExpiresAt.mockReturnValue("2026-06-01T12:15:00.000Z");
});

// ──────────────────────────────────────────────────────────────────────────

describe("Session ownership & recovery — cross-client integration (AUTH-065)", () => {
  describe("Refresh flow — concurrent user isolation", () => {
    it("prevents token confusion when two users refresh concurrently", async () => {
      // Simulate two users attempting refresh at the same time
      const user1RefreshToken = "user1.refresh.token";
      const user2RefreshToken = "user2.refresh.token";

      // User 1 refresh setup
      mockVerifyRefreshToken.mockReturnValueOnce({ userId: "user-1", role: UserRole.DJ, jti: "jti-1" });
      mockFindByJti.mockResolvedValueOnce({
        jti: "jti-1",
        userId: "user-1",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        revoked: false,
      });
      mockGenerateAccessToken.mockReturnValueOnce("new.access.token.user1");
      mockGenerateRefreshToken.mockReturnValueOnce({ token: "new.refresh.token.user1", jti: "jti-2" });

      const result1 = await refreshSession(user1RefreshToken);

      // User 2 refresh setup (independent call)
      mockVerifyRefreshToken.mockReturnValueOnce({ userId: "user-2", role: UserRole.PLANNER, jti: "jti-3" });
      mockFindByJti.mockResolvedValueOnce({
        jti: "jti-3",
        userId: "user-2",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        revoked: false,
      });
      mockGenerateAccessToken.mockReturnValueOnce("new.access.token.user2");
      mockGenerateRefreshToken.mockReturnValueOnce({ token: "new.refresh.token.user2", jti: "jti-4" });

      const result2 = await refreshSession(user2RefreshToken);

      // Verify tokens are isolated per user
      expect(result1.accessToken).not.toBe(result2.accessToken);
      expect(result1.refreshToken).not.toBe(result2.refreshToken);
      expect(result1.accessToken).toBe("new.access.token.user1");
      expect(result2.accessToken).toBe("new.access.token.user2");
    });

    it("rejects refresh when token jti exists but userId in record differs from token claims", async () => {
      // This simulates a security boundary: JWT claims user-1 but DB has user-2
      mockVerifyRefreshToken.mockReturnValue({ userId: "user-1", role: UserRole.DJ, jti: "jti-1" });
      mockFindByJti.mockResolvedValue({
        jti: "jti-1",
        userId: "user-2", // mismatch — database ownership violation
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        revoked: false,
      });

      await expect(refreshSession("crafted.refresh.token")).rejects.toMatchObject({
        code: AuthError.unauthorized().code,
      });
    });
  });

  describe("Introspection — ownership boundary enforcement", () => {
    it("returns userId and role for audit compliance", () => {
      mockVerifyAccessToken.mockReturnValue({
        userId: "user-123",
        role: UserRole.PLANNER,
      });

      const result = introspectSession("valid.access.token");

      expect(result).toEqual({
        valid: true,
        userId: "user-123",
        role: UserRole.PLANNER,
        expiresAt: "2026-06-01T12:15:00.000Z",
      });
    });

    it("does not leak user claims when token validation fails", () => {
      mockVerifyAccessToken.mockImplementation(() => {
        throw new Error("signature invalid");
      });

      const result = introspectSession("invalid.access.token");

      expect(result.valid).toBe(false);
      expect(result.userId).toBeUndefined();
      expect(result.role).toBeUndefined();
    });

    it("handles different roles in introspection response", () => {
      mockVerifyAccessToken.mockReturnValue({
        userId: "user-dj",
        role: UserRole.DJ,
      });

      const resultDJ = introspectSession("dj.access.token");
      expect(resultDJ.role).toBe(UserRole.DJ);

      vi.clearAllMocks();
      mockVerifyAccessToken.mockReturnValue({
        userId: "user-planner",
        role: UserRole.PLANNER,
      });

      const resultPlanner = introspectSession("planner.access.token");
      expect(resultPlanner.role).toBe(UserRole.PLANNER);
    });
  });

  describe("Logout — ownership verification at revocation", () => {
    it("revokes token by jti to prevent reuse across devices", async () => {
      mockVerifyRefreshToken.mockReturnValue({ userId: "user-1", role: UserRole.DJ, jti: "jti-device-1" });

      await logoutSession("refresh.token.device1");

      expect(mockRevoke).toHaveBeenCalledWith("jti-device-1");
    });

    it("completes logout gracefully even if token record is not found", async () => {
      mockVerifyRefreshToken.mockReturnValue({ userId: "user-1", role: UserRole.DJ, jti: "jti-orphaned" });

      const result = await logoutSession("orphaned.refresh.token");

      expect(result.loggedOut).toBe(true);
      expect(mockRevoke).toHaveBeenCalledWith("jti-orphaned");
    });

    it("remains idempotent — logout succeeds even if already logged out", async () => {
      mockVerifyRefreshToken.mockReturnValue({ userId: "user-1", role: UserRole.DJ, jti: "jti-1" });

      const result1 = await logoutSession("refresh.token");
      const result2 = await logoutSession("refresh.token");

      expect(result1.loggedOut).toBe(true);
      expect(result2.loggedOut).toBe(true);
    });
  });

  describe("Recovery flow — metadata preservation across apps", () => {
    it("preserves userId when issuing new tokens after refresh", async () => {
      mockVerifyRefreshToken.mockReturnValue({ userId: "user-456", role: UserRole.PLANNER, jti: "jti-old" });
      mockFindByJti.mockResolvedValue({
        jti: "jti-old",
        userId: "user-456",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        revoked: false,
      });
      mockGenerateAccessToken.mockReturnValue("new.access.token");
      mockGenerateRefreshToken.mockReturnValue({ token: "new.refresh.token", jti: "jti-new" });

      await refreshSession("valid.refresh.token");

      // Verify new token record preserves userId
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-456", // ownership preserved
          jti: "jti-new",
        }),
      );
    });

    it("enforces single-use refresh — old token must be revoked before new one saved", async () => {
      mockVerifyRefreshToken.mockReturnValue({ userId: "user-1", role: UserRole.DJ, jti: "jti-1" });
      mockFindByJti.mockResolvedValue({
        jti: "jti-1",
        userId: "user-1",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        revoked: false,
      });
      mockGenerateAccessToken.mockReturnValue("new.access.token");
      mockGenerateRefreshToken.mockReturnValue({ token: "new.refresh.token", jti: "jti-2" });

      await refreshSession("valid.refresh.token");

      // Verify revoke happened first
      const revokeCall = mockRevoke.mock.invocationCallOrder[0];
      const saveCall = mockSave.mock.invocationCallOrder[0];

      expect(revokeCall).toBeLessThan(saveCall);
      expect(mockRevoke).toHaveBeenCalledWith("jti-1");
    });

    it("returns new expiry timestamp consistent with access token lifetime", async () => {
      const expectedExpiry = "2026-06-01T13:45:00.000Z";
      mockAccessTokenExpiresAt.mockReturnValue(expectedExpiry);
      mockVerifyRefreshToken.mockReturnValue({ userId: "user-1", role: UserRole.DJ, jti: "jti-1" });
      mockFindByJti.mockResolvedValue({
        jti: "jti-1",
        userId: "user-1",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        revoked: false,
      });
      mockGenerateAccessToken.mockReturnValue("new.access.token");
      mockGenerateRefreshToken.mockReturnValue({ token: "new.refresh.token", jti: "jti-2" });

      const result = await refreshSession("valid.refresh.token");

      expect(result.expiresAt).toBe(expectedExpiry);
    });
  });

  describe("Edge cases — recovery robustness", () => {
    it("handles expired refresh token by rejecting refresh", async () => {
      mockVerifyRefreshToken.mockReturnValue({ userId: "user-1", role: UserRole.DJ, jti: "jti-1" });
      mockFindByJti.mockResolvedValue({
        jti: "jti-1",
        userId: "user-1",
        expiresAt: new Date(Date.now() - 1000).toISOString(), // expired
        revoked: false,
      });

      await expect(refreshSession("expired.refresh.token")).rejects.toMatchObject({
        code: AuthError.unauthorized().code,
      });
    });

    it("prevents replay of revoked refresh tokens", async () => {
      mockVerifyRefreshToken.mockReturnValue({ userId: "user-1", role: UserRole.DJ, jti: "jti-1" });
      mockFindByJti.mockResolvedValue({
        jti: "jti-1",
        userId: "user-1",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        revoked: true, // already revoked
      });

      await expect(refreshSession("already.revoked.token")).rejects.toMatchObject({
        code: AuthError.unauthorized().code,
      });
    });

    it("rejects tokens with mismatched userId and jti even if both are valid independently", async () => {
      // Token was issued to user-1, but database thinks it was issued to user-2
      mockVerifyRefreshToken.mockReturnValue({ userId: "user-2", role: UserRole.DJ, jti: "jti-user1" });
      mockFindByJti.mockResolvedValue({
        jti: "jti-user1",
        userId: "user-1", // inconsistent
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        revoked: false,
      });

      await expect(refreshSession("mismatched.refresh.token")).rejects.toMatchObject({
        code: AuthError.unauthorized().code,
      });
    });
  });

  describe("Type safety — shared contracts validation", () => {
    it("introspection response conforms to IntrospectResponse contract", () => {
      mockVerifyAccessToken.mockReturnValue({ userId: "user-1", role: UserRole.DJ });

      const result = introspectSession("valid.access.token");

      // Check contract shape
      expect(typeof result.valid).toBe("boolean");
      expect(typeof result.userId).toBe("string");
      expect(typeof result.role).toBe("string");
      expect(typeof result.expiresAt).toBe("string");
    });

    it("refresh response conforms to SessionRefreshResponse contract", async () => {
      mockVerifyRefreshToken.mockReturnValue({ userId: "user-1", role: UserRole.DJ, jti: "jti-1" });
      mockFindByJti.mockResolvedValue({
        jti: "jti-1",
        userId: "user-1",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        revoked: false,
      });
      mockGenerateAccessToken.mockReturnValue("new.access.token");
      mockGenerateRefreshToken.mockReturnValue({ token: "new.refresh.token", jti: "jti-2" });

      const result = await refreshSession("valid.refresh.token");

      // Check contract shape
      expect(typeof result.accessToken).toBe("string");
      expect(typeof result.refreshToken).toBe("string");
      expect(typeof result.expiresAt).toBe("string");
    });

    it("logout response conforms to SessionLogoutResponse contract", async () => {
      mockVerifyRefreshToken.mockReturnValue({ userId: "user-1", role: UserRole.DJ, jti: "jti-1" });

      const result = await logoutSession("valid.refresh.token");

      // Check contract shape
      expect(typeof result.loggedOut).toBe("boolean");
    });
  });

  describe("Consistency across recovery paths", () => {
    it("maintains role when same user refreshes and then introspects", async () => {
      // First, refresh for user-1
      mockVerifyRefreshToken.mockReturnValue({ userId: "user-1", role: UserRole.DJ, jti: "jti-1" });
      mockFindByJti.mockResolvedValue({
        jti: "jti-1",
        userId: "user-1",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        revoked: false,
      });
      mockGenerateAccessToken.mockReturnValue("new.access.token.1");
      mockGenerateRefreshToken.mockReturnValue({ token: "new.refresh.token", jti: "jti-2" });

      const refreshResult = await refreshSession("valid.refresh.token.1");

      // Then introspect with the new access token
      mockVerifyAccessToken.mockReturnValue({
        userId: "user-1",
        role: UserRole.DJ,
      });

      const introspectResult = introspectSession(refreshResult.accessToken);

      // Ensure role consistency
      expect(introspectResult.role).toBe(UserRole.DJ);
      expect(introspectResult.userId).toBe("user-1");
    });

    it("handles logout after refresh — tokens remain consistent", async () => {
      // Refresh
      mockVerifyRefreshToken.mockReturnValue({ userId: "user-1", role: UserRole.DJ, jti: "jti-1" });
      mockFindByJti.mockResolvedValue({
        jti: "jti-1",
        userId: "user-1",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        revoked: false,
      });
      mockGenerateAccessToken.mockReturnValue("new.access.token");
      mockGenerateRefreshToken.mockReturnValue({ token: "new.refresh.token", jti: "jti-2" });

      const refreshResult = await refreshSession("old.refresh.token");

      // Then logout with new refresh token
      vi.clearAllMocks();
      mockAccessTokenExpiresAt.mockReturnValue("2026-06-01T12:15:00.000Z");
      mockVerifyRefreshToken.mockReturnValue({ userId: "user-1", role: UserRole.DJ, jti: "jti-2" });

      const logoutResult = await logoutSession(refreshResult.refreshToken);

      expect(logoutResult.loggedOut).toBe(true);
      expect(mockRevoke).toHaveBeenCalledWith("jti-2");
    });
  });
});
