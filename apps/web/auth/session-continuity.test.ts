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
