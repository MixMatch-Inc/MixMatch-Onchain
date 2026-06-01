import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@themixmatch/types";
import type { AuthSession } from "@themixmatch/types";

const { mockIntrospectSession, mockRefreshSession } = vi.hoisted(() => ({
  mockIntrospectSession: vi.fn(),
  mockRefreshSession: vi.fn(),
}));

vi.mock("./auth-client", () => ({
  introspectSession: (...args: unknown[]) => mockIntrospectSession(...args),
  refreshSession: (...args: unknown[]) => mockRefreshSession(...args),
}));

import { ensureSessionContinuity, evaluateProtectedRouteGuard } from "./session-continuity";

const storedSession: AuthSession = {
  token: "access.token",
  refreshToken: "refresh.token",
  user: {
    id: "user-1",
    name: "dj",
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
});

describe("ensureSessionContinuity", () => {
  it("returns valid when introspection succeeds", async () => {
    mockIntrospectSession.mockResolvedValue({ valid: true, userId: "user-1", role: UserRole.DJ });

    await expect(ensureSessionContinuity(storedSession)).resolves.toEqual({
      status: "valid",
      session: storedSession,
    });
  });

  it("refreshes the session when introspection fails but refresh succeeds", async () => {
    mockIntrospectSession.mockResolvedValue({ valid: false });
    mockRefreshSession.mockResolvedValue({
      accessToken: "new.access.token",
      refreshToken: "new.refresh.token",
      expiresAt: "2026-06-01T12:15:00.000Z",
    });

    const outcome = await ensureSessionContinuity(storedSession);

    expect(outcome.status).toBe("refreshed");
    if (outcome.status === "refreshed") {
      expect(outcome.session.token).toBe("new.access.token");
      expect(outcome.session.refreshToken).toBe("new.refresh.token");
    }
  });

  it("returns expired when refresh is unavailable", async () => {
    mockIntrospectSession.mockResolvedValue({ valid: false });
    mockRefreshSession.mockRejectedValue(new Error("refresh failed"));

    await expect(ensureSessionContinuity(storedSession)).resolves.toEqual({ status: "expired" });
  });
});

describe("evaluateProtectedRouteGuard", () => {
  it("denies access when no session is present", () => {
    expect(evaluateProtectedRouteGuard(null)).toEqual({
      allowed: false,
      reason: "missing_session",
    });
  });

  it("allows access when a session token is present", () => {
    expect(evaluateProtectedRouteGuard(storedSession)).toEqual({
      allowed: true,
      userId: "user-1",
      role: UserRole.DJ,
    });
  });
});

// ── Recovery & Ownership Regression Tests (AUTH-063) ──────────────────────

describe("Session continuity — ownership and recovery regression", () => {
  describe("Token refresh recovery", () => {
    it("preserves user identity across token refresh", async () => {
      mockIntrospectSession.mockResolvedValue({ valid: false });
      mockRefreshSession.mockResolvedValue({
        accessToken: "new.access.token",
        refreshToken: "new.refresh.token",
        expiresAt: "2026-06-01T12:15:00.000Z",
      });

      const outcome = await ensureSessionContinuity(storedSession);

      expect(outcome.status).toBe("refreshed");
      if (outcome.status === "refreshed") {
        expect(outcome.session.user.id).toBe("user-1");
        expect(outcome.session.session.userId).toBe("user-1");
      }
    });

    it("preserves user role after refresh recovery", async () => {
      mockIntrospectSession.mockResolvedValue({ valid: false });
      mockRefreshSession.mockResolvedValue({
        accessToken: "new.access.token",
        refreshToken: "new.refresh.token",
        expiresAt: "2026-06-01T12:15:00.000Z",
      });

      const outcome = await ensureSessionContinuity(storedSession);

      expect(outcome.status).toBe("refreshed");
      if (outcome.status === "refreshed") {
        expect(outcome.session.user.role).toBe(UserRole.DJ);
        expect(outcome.session.session.role).toBe(UserRole.DJ);
      }
    });

    it("preserves wallet configuration during refresh recovery", async () => {
      const walletConfig = storedSession.session.wallet;
      mockIntrospectSession.mockResolvedValue({ valid: false });
      mockRefreshSession.mockResolvedValue({
        accessToken: "new.access.token",
        refreshToken: "new.refresh.token",
        expiresAt: "2026-06-01T12:15:00.000Z",
      });

      const outcome = await ensureSessionContinuity(storedSession);

      expect(outcome.status).toBe("refreshed");
      if (outcome.status === "refreshed") {
        expect(outcome.session.session.wallet).toEqual(walletConfig);
      }
    });

    it("preserves onboarding status across refresh", async () => {
      const completedSession = {
        ...storedSession,
        user: { ...storedSession.user, onboardingCompleted: true },
        session: { ...storedSession.session, onboardingCompleted: true },
      };

      mockIntrospectSession.mockResolvedValue({ valid: false });
      mockRefreshSession.mockResolvedValue({
        accessToken: "new.access.token",
        refreshToken: "new.refresh.token",
        expiresAt: "2026-06-01T12:15:00.000Z",
      });

      const outcome = await ensureSessionContinuity(completedSession);

      expect(outcome.status).toBe("refreshed");
      if (outcome.status === "refreshed") {
        expect(outcome.session.user.onboardingCompleted).toBe(true);
        expect(outcome.session.session.onboardingCompleted).toBe(true);
      }
    });

    it("uses the stored refresh token to obtain new access token", async () => {
      mockIntrospectSession.mockResolvedValue({ valid: false });
      mockRefreshSession.mockResolvedValue({
        accessToken: "new.access.token",
        refreshToken: "new.refresh.token",
        expiresAt: "2026-06-01T12:15:00.000Z",
      });

      await ensureSessionContinuity(storedSession);

      expect(mockRefreshSession).toHaveBeenCalledWith("refresh.token");
    });

    it("updates both access and refresh tokens after recovery", async () => {
      mockIntrospectSession.mockResolvedValue({ valid: false });
      mockRefreshSession.mockResolvedValue({
        accessToken: "brand.new.access.token",
        refreshToken: "brand.new.refresh.token",
        expiresAt: "2026-06-01T12:15:00.000Z",
      });

      const outcome = await ensureSessionContinuity(storedSession);

      expect(outcome.status).toBe("refreshed");
      if (outcome.status === "refreshed") {
        expect(outcome.session.token).toBe("brand.new.access.token");
        expect(outcome.session.refreshToken).toBe("brand.new.refresh.token");
      }
    });
  });

  describe("Session validity transitions", () => {
    it("returns valid status when token introspection succeeds", async () => {
      mockIntrospectSession.mockResolvedValue({ valid: true, userId: "user-1", role: UserRole.DJ });

      const outcome = await ensureSessionContinuity(storedSession);

      expect(outcome.status).toBe("valid");
    });

    it("returns refreshed status when introspection fails but refresh succeeds", async () => {
      mockIntrospectSession.mockResolvedValue({ valid: false });
      mockRefreshSession.mockResolvedValue({
        accessToken: "new.access.token",
        refreshToken: "new.refresh.token",
        expiresAt: "2026-06-01T12:15:00.000Z",
      });

      const outcome = await ensureSessionContinuity(storedSession);

      expect(outcome.status).toBe("refreshed");
    });

    it("returns expired status when both introspection and refresh fail", async () => {
      mockIntrospectSession.mockResolvedValue({ valid: false });
      mockRefreshSession.mockRejectedValue(new Error("token expired"));

      const outcome = await ensureSessionContinuity(storedSession);

      expect(outcome.status).toBe("expired");
    });

    it("does not include session data when status is expired", async () => {
      mockIntrospectSession.mockResolvedValue({ valid: false });
      mockRefreshSession.mockRejectedValue(new Error("refresh token invalid"));

      const outcome = await ensureSessionContinuity(storedSession);

      expect(outcome.status).toBe("expired");
      expect((outcome as any).session).toBeUndefined();
    });
  });

  describe("Route guard ownership semantics", () => {
    it("denies access with missing_session reason when no session exists", () => {
      const result = evaluateProtectedRouteGuard(null);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("missing_session");
    });

    it("allows access with userId when session is present", () => {
      const result = evaluateProtectedRouteGuard(storedSession);

      expect(result.allowed).toBe(true);
      expect(result.userId).toBe("user-1");
    });

    it("includes role in guard result for role-based routing", () => {
      const result = evaluateProtectedRouteGuard(storedSession);

      expect(result.role).toBe(UserRole.DJ);
    });

    it("enforces that guard result userId matches session user id", () => {
      const result = evaluateProtectedRouteGuard(storedSession);

      expect(result.userId).toBe(storedSession.user.id);
    });

    it("enforces that guard result role matches session role", () => {
      const result = evaluateProtectedRouteGuard(storedSession);

      expect(result.role).toBe(storedSession.user.role);
    });
  });

  describe("Multi-role session recovery", () => {
    it("recovers PLANNER sessions with correct role preservation", async () => {
      const plannerSession: AuthSession = {
        ...storedSession,
        user: { ...storedSession.user, role: UserRole.PLANNER },
        session: { ...storedSession.session, role: UserRole.PLANNER },
      };

      mockIntrospectSession.mockResolvedValue({ valid: false });
      mockRefreshSession.mockResolvedValue({
        accessToken: "new.access.token",
        refreshToken: "new.refresh.token",
        expiresAt: "2026-06-01T12:15:00.000Z",
      });

      const outcome = await ensureSessionContinuity(plannerSession);

      expect(outcome.status).toBe("refreshed");
      if (outcome.status === "refreshed") {
        expect(outcome.session.user.role).toBe(UserRole.PLANNER);
      }
    });

    it("recovers MUSIC_LOVER sessions with correct role preservation", async () => {
      const musicLoverSession: AuthSession = {
        ...storedSession,
        user: { ...storedSession.user, role: UserRole.MUSIC_LOVER },
        session: { ...storedSession.session, role: UserRole.MUSIC_LOVER },
      };

      mockIntrospectSession.mockResolvedValue({ valid: false });
      mockRefreshSession.mockResolvedValue({
        accessToken: "new.access.token",
        refreshToken: "new.refresh.token",
        expiresAt: "2026-06-01T12:15:00.000Z",
      });

      const outcome = await ensureSessionContinuity(musicLoverSession);

      expect(outcome.status).toBe("refreshed");
      if (outcome.status === "refreshed") {
        expect(outcome.session.user.role).toBe(UserRole.MUSIC_LOVER);
      }
    });
  });
});
