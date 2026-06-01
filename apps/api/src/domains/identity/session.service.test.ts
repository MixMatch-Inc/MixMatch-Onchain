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
