import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  UserRole,
  continueSessionAfterRefresh,
  evaluateProtectedRouteGuard,
  isSupportedStellarSessionToken,
  type AuthSession,
} from "@themixmatch/types";
import { refreshSession } from "./session.service.js";

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
const mockGenerateAccessToken = vi.fn();
const mockGenerateRefreshToken = vi.fn();
const mockAccessTokenExpiresAt = vi.fn();

vi.mock("../../services/jwt.service.js", () => ({
  verifyRefreshToken: (...args: unknown[]) => mockVerifyRefreshToken(...args),
  verifyAccessToken: vi.fn(),
  generateAccessToken: (...args: unknown[]) => mockGenerateAccessToken(...args),
  generateRefreshToken: (...args: unknown[]) => mockGenerateRefreshToken(...args),
  accessTokenExpiresAt: (...args: unknown[]) => mockAccessTokenExpiresAt(...args),
}));

const storedSession: AuthSession = {
  token: "eyJ.old.access.token",
  refreshToken: "local.refresh.token",
  user: {
    id: "user-1",
    name: "DJ Nova",
    email: "dj@example.com",
    role: UserRole.DJ,
    onboardingCompleted: false,
  },
  session: {
    userId: "user-1",
    role: UserRole.DJ,
    onboardingCompleted: false,
    issuedAt: "2026-06-01T12:00:00.000Z",
    wallet: {
      service: "stellar-service",
      status: "unlinked",
      networkPassphrase: "Test SDF Network ; September 2015",
      horizonUrl: "https://horizon-testnet.stellar.org",
      availableWallets: ["phantom", "freighter"],
    },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAccessTokenExpiresAt.mockReturnValue("2026-06-01T12:15:00.000Z");
});

describe("auth-plus-Stellar boundary shared contract", () => {
  it("preserves session continuity and protected-route access after a valid refresh", async () => {
    mockVerifyRefreshToken.mockReturnValue({ userId: "user-1", role: UserRole.DJ, jti: "jti-1" });
    mockFindByJti.mockResolvedValue({
      jti: "jti-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      revoked: false,
    });
    mockGenerateAccessToken.mockReturnValue("eyJ.new.access.token");
    mockGenerateRefreshToken.mockReturnValue({ token: "local.new.refresh.token", jti: "jti-2" });

    const refreshed = await refreshSession(storedSession.refreshToken);
    const continuedSession = continueSessionAfterRefresh(
      storedSession,
      refreshed,
      "2026-06-01T12:05:00.000Z",
    );

    expect(continuedSession.user).toEqual(storedSession.user);
    expect(continuedSession.session.userId).toBe("user-1");
    expect(continuedSession.session.wallet).toEqual(storedSession.session.wallet);
    expect(evaluateProtectedRouteGuard(continuedSession)).toEqual({
      allowed: true,
      userId: "user-1",
      role: UserRole.DJ,
    });
    expect(isSupportedStellarSessionToken(continuedSession.token)).toBe(true);
  });

  it("denies protected access and rejects mismatched ownership at the Stellar boundary", async () => {
    mockVerifyRefreshToken.mockReturnValue({ userId: "user-1", role: UserRole.DJ, jti: "jti-1" });
    mockFindByJti.mockResolvedValue({
      jti: "jti-1",
      userId: "user-2",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      revoked: false,
    });

    await expect(refreshSession(storedSession.refreshToken)).rejects.toMatchObject({
      code: "AUTH_UNAUTHORIZED",
      statusCode: 401,
    });

    expect(evaluateProtectedRouteGuard(null)).toEqual({
      allowed: false,
      reason: "missing_session",
    });
    expect(isSupportedStellarSessionToken("garbage-token")).toBe(false);
    expect(mockRevoke).toHaveBeenCalledWith("jti-1");
  });
});
