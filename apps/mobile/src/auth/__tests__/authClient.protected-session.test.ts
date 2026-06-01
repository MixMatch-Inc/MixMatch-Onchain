import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { validateSession, refreshSession, AuthClientError } from "../authClient";
import type { ValidateSessionRequest, SessionRefreshRequest } from "@themixmatch/types";

const validToken = "test-access-token";
const validRefreshToken = "test-refresh-token";
const mockFetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Local fallback tests — run when EXPO_PUBLIC_API_BASE_URL is not set
// ---------------------------------------------------------------------------
describe("validateSession (local fallback)", () => {
  it("returns isValid=false for local mode since no server validation", async () => {
    const result = await validateSession({ accessToken: validToken });
    expect(result.isValid).toBe(false);
    expect(result.needsRefresh).toBe(false);
  });
});

describe("refreshSession (local fallback)", () => {
  it("throws error in local mode", async () => {
    await expect(refreshSession({ refreshToken: validRefreshToken })).rejects.toThrow(AuthClientError);
  });
});

// ---------------------------------------------------------------------------
// Remote error-path tests
// ---------------------------------------------------------------------------
describe("validateSession (remote)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws on network failure", async () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = "http://localhost:3001";
    vi.resetModules();
    const { validateSession: remoteValidate } = await import("../authClient");

    mockFetch.mockRejectedValue(new Error("Network request failed"));
    await expect(remoteValidate({ accessToken: validToken })).rejects.toThrow();

    delete process.env.EXPO_PUBLIC_API_BASE_URL;
  });

  it("returns ProtectedSession on success", async () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = "http://localhost:3001";
    vi.resetModules();
    const mod = await import("../authClient");

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          isValid: true,
          needsRefresh: false,
          userId: "user-123",
          role: "MUSIC_LOVER",
          expiresAt: "2026-12-31T23:59:59.000Z",
        },
      }),
    });

    const result = await mod.validateSession({ accessToken: validToken });
    expect(result.isValid).toBe(true);
    expect(result.userId).toBe("user-123");

    delete process.env.EXPO_PUBLIC_API_BASE_URL;
  });
});

describe("refreshSession (remote)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns SessionRefreshResponse on success", async () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = "http://localhost:3001";
    vi.resetModules();
    const mod = await import("../authClient");

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          accessToken: "new-access-token",
          refreshToken: "new-refresh-token",
          expiresAt: "2026-12-31T23:59:59.000Z",
        },
      }),
    });

    const result = await mod.refreshSession({ refreshToken: validRefreshToken });
    expect(result.accessToken).toBe("new-access-token");
    expect(result.refreshToken).toBe("new-refresh-token");

    delete process.env.EXPO_PUBLIC_API_BASE_URL;
  });
});