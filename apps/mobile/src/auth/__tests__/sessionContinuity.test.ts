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
  service: "stellar-service" as const,
  status: "unlinked" as const,
  networkPassphrase: "Test SDF Network ; September 2015",
  horizonUrl: "https://horizon-testnet.stellar.org",
  availableWallets: ["phantom", "freighter"],
};

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