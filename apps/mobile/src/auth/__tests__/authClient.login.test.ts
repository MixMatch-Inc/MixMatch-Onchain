import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { login, AuthClientError } from "../authClient";
import type { LoginRequest } from "@themixmatch/types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const validInput: LoginRequest = { email: "test@example.com", password: "secret123" };
const mockFetch = vi.fn();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Sets EXPO_PUBLIC_API_BASE_URL, resets modules so authClient re-evaluates
 * apiBaseUrl, runs the callback, then cleans up — keeping every remote test DRY.
 */
async function withRemoteEnv<T>(
  fn: (mod: typeof import("../authClient")) => Promise<T>,
): Promise<T> {
  process.env.EXPO_PUBLIC_API_BASE_URL = "http://localhost:3001";
  vi.resetModules();
  const mod = await import("../authClient");
  try {
    return await fn(mod);
  } finally {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
  }
}

/**
 * Asserts that a promise rejects with an AuthClientError whose `kind` and
 * `code` match the expected values.
 */
async function expectAuthClientError(
  promise: Promise<unknown>,
  mod: typeof import("../authClient"),
  expected: { kind: string; code?: string },
): Promise<void> {
  let caught: unknown;
  try {
    await promise;
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeInstanceOf(mod.AuthClientError);
  const err = caught as InstanceType<typeof mod.AuthClientError>;
  expect(err.kind).toBe(expected.kind);
  if (expected.code !== undefined) {
    expect(err.code).toBe(expected.code);
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// AuthClientError constructor
// ---------------------------------------------------------------------------

describe("AuthClientError", () => {
  it("exposes kind and code on construction", () => {
    const err = new AuthClientError("api", "bad creds", { code: "AUTH_INVALID_CREDENTIALS" });
    expect(err).toBeInstanceOf(Error);
    expect(err.kind).toBe("api");
    expect(err.code).toBe("AUTH_INVALID_CREDENTIALS");
    expect(err.message).toBe("bad creds");
  });

  it("works without a code", () => {
    const err = new AuthClientError("network", "Network request failed");
    expect(err.kind).toBe("network");
    expect(err.code).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Local fallback tests — run when EXPO_PUBLIC_API_BASE_URL is not set
// ---------------------------------------------------------------------------

describe("login (local fallback)", () => {
  it("returns an AuthSession with token, user, and session", async () => {
    const session = await login(validInput);
    expect(session).toHaveProperty("token");
    expect(session).toHaveProperty("user");
    expect(session).toHaveProperty("session");
    expect(session.user.email).toBe("test@example.com");
    expect(session.user.role).toBe("MUSIC_LOVER");
    expect(session.session.issuedAt).toBeDefined();
  });

  it("derives the user name from the email local part", async () => {
    const session = await login({ email: "john.doe@example.com", password: "pw" });
    expect(session.user.name).toBe("john.doe");
  });

  it("falls back to 'mixmatch-user' when email is empty", async () => {
    const session = await login({ email: "", password: "pw" });
    expect(session.user.name).toBe("mixmatch-user");
  });
});

// ---------------------------------------------------------------------------
// Remote error-path tests — EXPO_PUBLIC_API_BASE_URL is set per test via
// withRemoteEnv so that apiBaseUrl is re-evaluated on each dynamic import.
// ---------------------------------------------------------------------------

describe("login (remote error handling)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws on network failure", async () => {
    await withRemoteEnv(async ({ login: remoteLogin }) => {
      mockFetch.mockRejectedValue(new Error("Network request failed"));
      await expect(remoteLogin(validInput)).rejects.toThrow("Network request failed");
    });
  });

  it("throws AuthClientError with kind 'api' and code 'AUTH_INVALID_CREDENTIALS' on 401", async () => {
    await withRemoteEnv(async (mod) => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          code: "AUTH_INVALID_CREDENTIALS",
          message: "Invalid email or password",
        }),
      });

      await expectAuthClientError(mod.login(validInput), mod, {
        kind: "api",
        code: "AUTH_INVALID_CREDENTIALS",
      });
    });
  });

  it("throws AuthClientError with kind 'api' on other 4xx status codes", async () => {
    await withRemoteEnv(async (mod) => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({
          success: false,
          code: "AUTH_FORBIDDEN",
          message: "Forbidden",
        }),
      });

      await expectAuthClientError(mod.login(validInput), mod, {
        kind: "api",
        code: "AUTH_FORBIDDEN",
      });
    });
  });

  it("throws on non-JSON response", async () => {
    await withRemoteEnv(async ({ login: remoteLogin }) => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      await expect(remoteLogin(validInput)).rejects.toThrow();
    });
  });

  it("throws on unrecognised response envelope", async () => {
    await withRemoteEnv(async ({ login: remoteLogin }) => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { unexpected: true } }),
      });

      await expect(remoteLogin(validInput)).rejects.toThrow();
    });
  });

  it("throws on a successful envelope with missing token field", async () => {
    await withRemoteEnv(async ({ login: remoteLogin }) => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { user: {}, session: {} } }),
      });

      await expect(remoteLogin(validInput)).rejects.toThrow();
    });
  });
});