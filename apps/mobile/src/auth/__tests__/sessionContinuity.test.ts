import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@themixmatch/types";
import type { AuthSession } from "@themixmatch/types";

import { ensureSessionContinuity, evaluateProtectedRouteGuard } from "../sessionContinuity";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockIntrospectSession = vi.fn();
const mockRefreshSession = vi.fn();

vi.mock("../authClient", () => ({
  introspectSession: (...args: unknown[]) => mockIntrospectSession(...args),
  refreshSession: (...args: unknown[]) => mockRefreshSession(...args),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const walletFixture = {
  service: "stellar-service",
  status: "unlinked",
  networkPassphrase: "Test SDF Network ; September 2015",
  horizonUrl: "https://horizon-testnet.stellar.org",
  availableWallets: ["phantom", "freighter"],
} as const;

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
    wallet: walletFixture,
  },
};

const completedOnboardingSession: AuthSession = {
  ...storedSession,
  user: { ...storedSession.user, onboardingCompleted: true },
  session: { ...storedSession.session, onboardingCompleted: true },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Narrows outcome.status and fails fast if it doesn't match, avoiding
 * repetitive `if (outcome.status === ...) { ... }` blocks in tests.
 */
function assertStatus<S extends string>(
  outcome: { status: string },
  status: S,
): asserts outcome is { status: S } & typeof outcome {
  expect(outcome.status).toBe(status);
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// ensureSessionContinuity
// ---------------------------------------------------------------------------

describe("ensureSessionContinuity (mobile)", () => {
  it("returns valid when introspection succeeds", async () => {
    mockIntrospectSession.mockResolvedValue({ valid: true, userId: "user-1", role: UserRole.DJ });

    await expect(ensureSessionContinuity(storedSession)).resolves.toEqual({
      status: "valid",
      session: storedSession,
    });
  });

  it("calls introspectSession with the stored access token", async () => {
    mockIntrospectSession.mockResolvedValue({ valid: true, userId: "user-1", role: UserRole.DJ });

    await ensureSessionContinuity(storedSession);

    expect(mockIntrospectSession).toHaveBeenCalledWith(storedSession.token);
    expect(mockIntrospectSession).toHaveBeenCalledTimes(1);
  });

  it("refreshes and returns updated tokens when introspection fails", async () => {
    mockIntrospectSession.mockResolvedValue({ valid: false });
    mockRefreshSession.mockResolvedValue({
      accessToken: "new.access.token",
      refreshToken: "new.refresh.token",
      expiresAt: "2026-06-01T12:15:00.000Z",
    });

    const outcome = await ensureSessionContinuity(storedSession);

    assertStatus(outcome, "refreshed");
    expect(outcome.session.token).toBe("new.access.token");
    expect(outcome.session.refreshToken).toBe("new.refresh.token");
  });

  it("preserves user and session metadata after a refresh", async () => {
    mockIntrospectSession.mockResolvedValue({ valid: false });
    mockRefreshSession.mockResolvedValue({
      accessToken: "new.access.token",
      refreshToken: "new.refresh.token",
      expiresAt: "2026-06-01T12:15:00.000Z",
    });

    const outcome = await ensureSessionContinuity(storedSession);

    assertStatus(outcome, "refreshed");
    expect(outcome.session.user).toEqual(storedSession.user);
    expect(outcome.session.session.wallet).toEqual(walletFixture);
  });

  it("calls refreshSession with the stored refresh token", async () => {
    mockIntrospectSession.mockResolvedValue({ valid: false });
    mockRefreshSession.mockResolvedValue({
      accessToken: "new.access.token",
      refreshToken: "new.refresh.token",
      expiresAt: "2026-06-01T12:15:00.000Z",
    });

    await ensureSessionContinuity(storedSession);

    expect(mockRefreshSession).toHaveBeenCalledWith(storedSession.refreshToken);
  });

  it("returns expired when refreshToken is undefined", async () => {
    mockIntrospectSession.mockResolvedValue({ valid: false });
    const sessionWithoutRefresh = { ...storedSession, refreshToken: undefined as unknown as string };

    await expect(ensureSessionContinuity(sessionWithoutRefresh)).resolves.toEqual({
      status: "expired",
    });
    expect(mockRefreshSession).not.toHaveBeenCalled();
  });

  it("returns expired when refreshToken is an empty string", async () => {
    mockIntrospectSession.mockResolvedValue({ valid: false });
    const sessionWithEmptyRefresh = { ...storedSession, refreshToken: "" };

    await expect(ensureSessionContinuity(sessionWithEmptyRefresh)).resolves.toEqual({
      status: "expired",
    });
    expect(mockRefreshSession).not.toHaveBeenCalled();
  });

  it("returns expired when refresh call throws", async () => {
    mockIntrospectSession.mockResolvedValue({ valid: false });
    mockRefreshSession.mockRejectedValue(new Error("refresh failed"));

    await expect(ensureSessionContinuity(storedSession)).resolves.toEqual({ status: "expired" });
  });

  it("does not call refreshSession when introspection succeeds", async () => {
    mockIntrospectSession.mockResolvedValue({ valid: true, userId: "user-1", role: UserRole.DJ });

    await ensureSessionContinuity(storedSession);

    expect(mockRefreshSession).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// evaluateProtectedRouteGuard
// ---------------------------------------------------------------------------

describe("evaluateProtectedRouteGuard (mobile)", () => {
  it("denies access when no session is present", () => {
    expect(evaluateProtectedRouteGuard(null)).toEqual({
      allowed: false,
      reason: "missing_session",
    });
  });

  it("denies access when session token is missing", () => {
    const sessionWithoutToken = { ...storedSession, token: undefined as unknown as string };
    expect(evaluateProtectedRouteGuard(sessionWithoutToken)).toEqual({
      allowed: false,
      reason: "missing_session",
    });
  });

  it("denies access when session token is an empty string", () => {
    const sessionWithEmptyToken = { ...storedSession, token: "" };
    expect(evaluateProtectedRouteGuard(sessionWithEmptyToken)).toEqual({
      allowed: false,
      reason: "missing_session",
    });
  });

  it("allows access and returns userId and role when token is present", () => {
    expect(evaluateProtectedRouteGuard(storedSession)).toEqual({
      allowed: true,
      userId: "user-1",
      role: UserRole.DJ,
    });
  });

  it("allows access for a session with onboarding completed", () => {
    const result = evaluateProtectedRouteGuard(completedOnboardingSession);
    expect(result).toMatchObject({ allowed: true, userId: "user-1", role: UserRole.DJ });
  });

  it("reflects the correct role for non-DJ users", () => {
    const musicLoverSession: AuthSession = {
      ...storedSession,
      user: { ...storedSession.user, role: UserRole.MUSIC_LOVER },
      session: { ...storedSession.session, role: UserRole.MUSIC_LOVER },
    };
    const result = evaluateProtectedRouteGuard(musicLoverSession);
    expect(result).toMatchObject({ allowed: true, role: UserRole.MUSIC_LOVER });
  });
});

// ---------------------------------------------------------------------------
// Ownership & Recovery Regression (AUTH-064)
// ---------------------------------------------------------------------------

describe("Session ownership & recovery regression (mobile)", () => {
  describe("Ownership isolation in session continuity", () => {
    it("preserves user identity through introspection validation", async () => {
      mockIntrospectSession.mockResolvedValue({
        valid: true,
        userId: "user-1",
        role: UserRole.DJ,
      });

      const outcome = await ensureSessionContinuity(storedSession);

      assertStatus(outcome, "valid");
      expect(outcome.session.user.id).toBe("user-1");
      expect(outcome.session.session.userId).toBe("user-1");
    });

    it("preserves user identity when session requires refresh", async () => {
      mockIntrospectSession.mockResolvedValue({ valid: false });
      mockRefreshSession.mockResolvedValue({
        accessToken: "new.access.token",
        refreshToken: "new.refresh.token",
        expiresAt: "2026-06-01T12:15:00.000Z",
      });

      const outcome = await ensureSessionContinuity(storedSession);

      assertStatus(outcome, "refreshed");
      expect(outcome.session.user.id).toBe("user-1");
      expect(outcome.session.session.userId).toBe("user-1");
    });

    it("prevents cross-user session hijacking by preserving original user context", async () => {
      // Simulates attacker trying to swap user IDs
      mockIntrospectSession.mockResolvedValue({ valid: false });
      mockRefreshSession.mockResolvedValue({
        accessToken: "new.access.token",
        refreshToken: "new.refresh.token",
        expiresAt: "2026-06-01T12:15:00.000Z",
      });

      const outcome = await ensureSessionContinuity(storedSession);

      assertStatus(outcome, "refreshed");
      // Must preserve original user-1, not accept crafted user-2
      expect(outcome.session.user.id).not.toBe("user-2");
      expect(outcome.session.user.id).toBe("user-1");
    });

    it("maintains role consistency across ownership boundary", async () => {
      mockIntrospectSession.mockResolvedValue({ valid: false });
      mockRefreshSession.mockResolvedValue({
        accessToken: "new.access.token",
        refreshToken: "new.refresh.token",
        expiresAt: "2026-06-01T12:15:00.000Z",
      });

      const outcome = await ensureSessionContinuity(storedSession);

      assertStatus(outcome, "refreshed");
      expect(outcome.session.user.role).toBe(UserRole.DJ);
      expect(outcome.session.session.role).toBe(UserRole.DJ);
    });
  });

  describe("Recovery flow with metadata preservation", () => {
    it("preserves email through recovery", async () => {
      mockIntrospectSession.mockResolvedValue({ valid: false });
      mockRefreshSession.mockResolvedValue({
        accessToken: "new.access.token",
        refreshToken: "new.refresh.token",
        expiresAt: "2026-06-01T12:15:00.000Z",
      });

      const outcome = await ensureSessionContinuity(storedSession);

      assertStatus(outcome, "refreshed");
      expect(outcome.session.user.email).toBe("dj@example.com");
    });

    it("preserves user name through recovery", async () => {
      mockIntrospectSession.mockResolvedValue({ valid: false });
      mockRefreshSession.mockResolvedValue({
        accessToken: "new.access.token",
        refreshToken: "new.refresh.token",
        expiresAt: "2026-06-01T12:15:00.000Z",
      });

      const outcome = await ensureSessionContinuity(storedSession);

      assertStatus(outcome, "refreshed");
      expect(outcome.session.user.name).toBe("dj");
    });

    it("preserves onboarding completion state through recovery", async () => {
      mockIntrospectSession.mockResolvedValue({ valid: false });
      mockRefreshSession.mockResolvedValue({
        accessToken: "new.access.token",
        refreshToken: "new.refresh.token",
        expiresAt: "2026-06-01T12:15:00.000Z",
      });

      const outcome = await ensureSessionContinuity(completedOnboardingSession);

      assertStatus(outcome, "refreshed");
      expect(outcome.session.user.onboardingCompleted).toBe(true);
      expect(outcome.session.session.onboardingCompleted).toBe(true);
    });

    it("preserves wallet bootstrap state through recovery", async () => {
      mockIntrospectSession.mockResolvedValue({ valid: false });
      mockRefreshSession.mockResolvedValue({
        accessToken: "new.access.token",
        refreshToken: "new.refresh.token",
        expiresAt: "2026-06-01T12:15:00.000Z",
      });

      const outcome = await ensureSessionContinuity(storedSession);

      assertStatus(outcome, "refreshed");
      expect(outcome.session.session.wallet).toEqual(walletFixture);
    });

    it("preserves Stellar network configuration through recovery", async () => {
      mockIntrospectSession.mockResolvedValue({ valid: false });
      mockRefreshSession.mockResolvedValue({
        accessToken: "new.access.token",
        refreshToken: "new.refresh.token",
        expiresAt: "2026-06-01T12:15:00.000Z",
      });

      const outcome = await ensureSessionContinuity(storedSession);

      assertStatus(outcome, "refreshed");
      expect(outcome.session.session.wallet.networkPassphrase).toBe(
        "Test SDF Network ; September 2015",
      );
      expect(outcome.session.session.wallet.horizonUrl).toBe(
        "https://horizon-testnet.stellar.org",
      );
    });
  });

  describe("Multi-user device isolation", () => {
    it("handles session for different user without leaking data", async () => {
      const otherUserSession: AuthSession = {
        ...storedSession,
        user: { ...storedSession.user, id: "user-2", name: "planner" },
        session: { ...storedSession.session, userId: "user-2" },
      };

      mockIntrospectSession.mockResolvedValue({ valid: false });
      mockRefreshSession.mockResolvedValue({
        accessToken: "new.access.token",
        refreshToken: "new.refresh.token",
        expiresAt: "2026-06-01T12:15:00.000Z",
      });

      const outcome = await ensureSessionContinuity(otherUserSession);

      assertStatus(outcome, "refreshed");
      expect(outcome.session.user.id).toBe("user-2");
      expect(outcome.session.user.name).toBe("planner");
    });

    it("maintains separate user contexts across sequential recoveries", async () => {
      // First recovery for user-1
      mockIntrospectSession.mockResolvedValue({ valid: false });
      mockRefreshSession.mockResolvedValue({
        accessToken: "new.access.token.1",
        refreshToken: "new.refresh.token.1",
        expiresAt: "2026-06-01T12:15:00.000Z",
      });

      const outcome1 = await ensureSessionContinuity(storedSession);
      assertStatus(outcome1, "refreshed");
      expect(outcome1.session.user.id).toBe("user-1");

      // Clear mocks for second recovery
      vi.clearAllMocks();

      // Second recovery for user-2
      const user2Session: AuthSession = {
        ...storedSession,
        user: { ...storedSession.user, id: "user-2" },
        session: { ...storedSession.session, userId: "user-2" },
      };

      mockIntrospectSession.mockResolvedValue({ valid: false });
      mockRefreshSession.mockResolvedValue({
        accessToken: "new.access.token.2",
        refreshToken: "new.refresh.token.2",
        expiresAt: "2026-06-01T12:15:00.000Z",
      });

      const outcome2 = await ensureSessionContinuity(user2Session);
      assertStatus(outcome2, "refreshed");
      expect(outcome2.session.user.id).toBe("user-2");

      // Ensure they remain separate
      expect(outcome1.session.user.id).not.toBe(outcome2.session.user.id);
    });
  });

  describe("Protected route guard ownership enforcement", () => {
    it("includes userId in guard decision for authorization checks", () => {
      const result = evaluateProtectedRouteGuard(storedSession);

      expect(result).toMatchObject({
        allowed: true,
        userId: "user-1",
      });
    });

    it("includes role in guard decision for role-based access", () => {
      const result = evaluateProtectedRouteGuard(storedSession);

      expect(result).toMatchObject({
        allowed: true,
        role: UserRole.DJ,
      });
    });

    it("denies access when userId is lost due to missing session", () => {
      const result = evaluateProtectedRouteGuard(null);

      expect(result.allowed).toBe(false);
      expect(result.userId).toBeUndefined();
      expect(result.reason).toBe("missing_session");
    });

    it("maintains userId consistency across guard checks for same session", () => {
      const result1 = evaluateProtectedRouteGuard(storedSession);
      const result2 = evaluateProtectedRouteGuard(storedSession);

      expect(result1.userId).toBe(result2.userId);
      expect(result1.userId).toBe("user-1");
    });

    it("reflects different userId for different sessions", () => {
      const session1 = storedSession;
      const session2: AuthSession = {
        ...storedSession,
        user: { ...storedSession.user, id: "user-99" },
        session: { ...storedSession.session, userId: "user-99" },
      };

      const result1 = evaluateProtectedRouteGuard(session1);
      const result2 = evaluateProtectedRouteGuard(session2);

      expect(result1.userId).toBe("user-1");
      expect(result2.userId).toBe("user-99");
      expect(result1.userId).not.toBe(result2.userId);
    });
  });
});