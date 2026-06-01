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

describe("refreshSession", () => {
  it("returns a rotated token pair when the refresh token is valid", async () => {
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

    expect(result).toEqual({
      accessToken: "new.access.token",
      refreshToken: "new.refresh.token",
      expiresAt: "2026-06-01T12:15:00.000Z",
    });
    expect(mockRevoke).toHaveBeenCalledWith("jti-1");
    expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ jti: "jti-2", userId: "user-1" }));
  });

  it("throws unauthorized when the refresh token is revoked", async () => {
    mockVerifyRefreshToken.mockReturnValue({ userId: "user-1", role: UserRole.DJ, jti: "jti-1" });
    mockFindByJti.mockResolvedValue({
      jti: "jti-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      revoked: true,
    });

    await expect(refreshSession("revoked.refresh.token")).rejects.toMatchObject({
      code: AuthError.unauthorized().code,
      statusCode: 401,
    });
  });
});

describe("introspectSession", () => {
  it("returns valid claims for a good access token", () => {
    mockVerifyAccessToken.mockReturnValue({ userId: "user-1", role: UserRole.PLANNER });

    expect(introspectSession("valid.access.token")).toEqual({
      valid: true,
      userId: "user-1",
      role: UserRole.PLANNER,
      expiresAt: "2026-06-01T12:15:00.000Z",
    });
  });

  it("returns valid:false for an invalid access token", () => {
    mockVerifyAccessToken.mockImplementation(() => {
      throw new Error("invalid token");
    });

    expect(introspectSession("bad.access.token")).toEqual({ valid: false });
  });
});

describe("logoutSession", () => {
  it("revokes the refresh token and reports loggedOut", async () => {
    mockVerifyRefreshToken.mockReturnValue({ userId: "user-1", role: UserRole.DJ, jti: "jti-1" });

    await expect(logoutSession("valid.refresh.token")).resolves.toEqual({ loggedOut: true });
    expect(mockRevoke).toHaveBeenCalledWith("jti-1");
  });

  it("still reports loggedOut when the refresh token is invalid", async () => {
    mockVerifyRefreshToken.mockImplementation(() => {
      throw new Error("invalid token");
    });

    await expect(logoutSession("bad.refresh.token")).resolves.toEqual({ loggedOut: true });
  });
});

// ── Ownership & Recovery Regression Tests (AUTH-062) ───────────────────────

describe("Session ownership & recovery — regression checks", () => {
  describe("refreshSession — ownership isolation", () => {
    it("rejects refresh token when token jti and record userId mismatch", async () => {
      // Token claims user-1, but stored record claims user-2 — security violation
      mockVerifyRefreshToken.mockReturnValue({ userId: "user-1", role: UserRole.DJ, jti: "jti-1" });
      mockFindByJti.mockResolvedValue({
        jti: "jti-1",
        userId: "user-2", // mismatch
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        revoked: false,
      });

      await expect(refreshSession("mismatched.refresh.token")).rejects.toMatchObject({
        code: AuthError.unauthorized().code,
        statusCode: 401,
      });
    });

    it("enforces single-use refresh by revoking the old token before issuing new pair", async () => {
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

      // Verify old token is revoked BEFORE new one is saved (order matters)
      expect(mockRevoke).toHaveBeenCalledWith("jti-1");
      expect(mockRevoke).toHaveBeenCalledBefore(mockSave as unknown as any);
    });

    it("preserves userId in new refresh token record during rotation", async () => {
      mockVerifyRefreshToken.mockReturnValue({ userId: "user-123", role: UserRole.PLANNER, jti: "jti-old" });
      mockFindByJti.mockResolvedValue({
        jti: "jti-old",
        userId: "user-123",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        revoked: false,
      });
      mockGenerateAccessToken.mockReturnValue("new.access.token");
      mockGenerateRefreshToken.mockReturnValue({ token: "new.refresh.token", jti: "jti-new" });

      await refreshSession("valid.refresh.token");

      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({
          jti: "jti-new",
          userId: "user-123", // ownership preserved
        }),
      );
    });
  });

  describe("introspectSession — ownership validation", () => {
    it("includes userId and role in introspection response for audit trail", () => {
      mockVerifyAccessToken.mockReturnValue({ userId: "user-456", role: UserRole.MUSIC_LOVER });

      const result = introspectSession("valid.access.token");

      expect(result).toEqual(
        expect.objectContaining({
          valid: true,
          userId: "user-456",
          role: UserRole.MUSIC_LOVER,
        }),
      );
    });

    it("returns valid:false without user claims when token is invalid", () => {
      mockVerifyAccessToken.mockImplementation(() => {
        throw new Error("signature mismatch");
      });

      const result = introspectSession("bad.access.token");

      expect(result.valid).toBe(false);
      expect(result.userId).toBeUndefined();
      expect(result.role).toBeUndefined();
    });
  });

  describe("Session recovery flow", () => {
    it("returns new tokens with correct expiry after successful refresh", async () => {
      mockVerifyRefreshToken.mockReturnValue({ userId: "user-1", role: UserRole.DJ, jti: "jti-1" });
      mockFindByJti.mockResolvedValue({
        jti: "jti-1",
        userId: "user-1",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        revoked: false,
      });
      const expectedExpiry = "2026-06-01T13:00:00.000Z";
      mockAccessTokenExpiresAt.mockReturnValue(expectedExpiry);
      mockGenerateAccessToken.mockReturnValue("new.access.token");
      mockGenerateRefreshToken.mockReturnValue({ token: "new.refresh.token", jti: "jti-2" });

      const result = await refreshSession("valid.refresh.token");

      expect(result.expiresAt).toBe(expectedExpiry);
      expect(result.accessToken).toBe("new.access.token");
      expect(result.refreshToken).toBe("new.refresh.token");
    });

    it("handles expired refresh token records correctly", async () => {
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

    it("completes logout without side effects even if token record is missing", async () => {
      mockVerifyRefreshToken.mockReturnValue({ userId: "user-1", role: UserRole.DJ, jti: "jti-orphaned" });

      const result = await logoutSession("orphaned.refresh.token");

      expect(result.loggedOut).toBe(true);
      expect(mockRevoke).toHaveBeenCalledWith("jti-orphaned");
    });
  });

  describe("Cross-session isolation regression", () => {
    it("rejects refresh token from different user even if jti exists", async () => {
      // Simulate token crafted with user-2's claims but user-1's jti
      mockVerifyRefreshToken.mockReturnValue({ userId: "user-2", role: UserRole.DJ, jti: "jti-user-1" });
      mockFindByJti.mockResolvedValue({
        jti: "jti-user-1",
        userId: "user-1", // stored for user-1, not user-2
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        revoked: false,
      });

      await expect(refreshSession("crafted.refresh.token")).rejects.toMatchObject({
        code: AuthError.unauthorized().code,
        statusCode: 401,
      });
    });

    it("maintains separate token families per user during concurrent refreshes", async () => {
      // First user's refresh
      mockVerifyRefreshToken.mockReturnValue({ userId: "user-1", role: UserRole.DJ, jti: "jti-1" });
      mockFindByJti.mockResolvedValue({
        jti: "jti-1",
        userId: "user-1",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        revoked: false,
      });
      mockGenerateAccessToken.mockReturnValue("new.access.token.1");
      mockGenerateRefreshToken.mockReturnValue({ token: "new.refresh.token.1", jti: "jti-2" });

      const result1 = await refreshSession("valid.refresh.token.1");

      expect(result1.accessToken).toBe("new.access.token.1");
      expect(result1.refreshToken).toBe("new.refresh.token.1");

      // Second user's refresh should be independent
      vi.clearAllMocks();
      mockAccessTokenExpiresAt.mockReturnValue("2026-06-01T12:15:00.000Z");
      mockVerifyRefreshToken.mockReturnValue({ userId: "user-2", role: UserRole.PLANNER, jti: "jti-3" });
      mockFindByJti.mockResolvedValue({
        jti: "jti-3",
        userId: "user-2",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        revoked: false,
      });
      mockGenerateAccessToken.mockReturnValue("new.access.token.2");
      mockGenerateRefreshToken.mockReturnValue({ token: "new.refresh.token.2", jti: "jti-4" });

      const result2 = await refreshSession("valid.refresh.token.2");

      expect(result2.accessToken).toBe("new.access.token.2");
      expect(result2.refreshToken).toBe("new.refresh.token.2");
    });
  });
});
