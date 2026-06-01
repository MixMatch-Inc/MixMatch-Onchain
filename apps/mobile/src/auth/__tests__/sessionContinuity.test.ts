import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@themixmatch/types";
import type { AuthSession } from "@themixmatch/types";

import { ensureSessionContinuity, evaluateProtectedRouteGuard } from "../sessionContinuity";

const mockIntrospectSession = vi.fn();
const mockRefreshSession = vi.fn();

vi.mock("../authClient", () => ({
  introspectSession: (...args: unknown[]) => mockIntrospectSession(...args),
  refreshSession: (...args: unknown[]) => mockRefreshSession(...args),
}));

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

describe("ensureSessionContinuity (mobile)", () => {
  it("returns valid when introspection succeeds", async () => {
    mockIntrospectSession.mockResolvedValue({ valid: true });

    await expect(ensureSessionContinuity(storedSession)).resolves.toEqual({
      status: "valid",
      session: storedSession,
    });
  });

  it("returns expired when refresh fails", async () => {
    mockIntrospectSession.mockResolvedValue({ valid: false });
    mockRefreshSession.mockRejectedValue(new Error("refresh failed"));

    await expect(ensureSessionContinuity(storedSession)).resolves.toEqual({ status: "expired" });
  });
});

describe("evaluateProtectedRouteGuard (mobile)", () => {
  it("denies access when no session is present", () => {
    expect(evaluateProtectedRouteGuard(null)).toEqual({
      allowed: false,
      reason: "missing_session",
    });
  });
});
