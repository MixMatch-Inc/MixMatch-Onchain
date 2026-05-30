import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { LoginRequest } from "@themixmatch/types";

const validInput: LoginRequest = { email: "test@example.com", password: "secret123" };
const mockFetch = vi.fn();

beforeEach(() => { vi.clearAllMocks(); });

describe("login (local fallback)", () => {
  it("returns an AuthSession when no API base URL is configured", async () => {
    vi.resetModules();
    const { login } = await import("../authClient");
    const session = await login(validInput);
    expect(session).toHaveProperty("token");
    expect(session).toHaveProperty("user");
    expect(session).toHaveProperty("session");
    expect(session.user.email).toBe("test@example.com");
    expect(session.user.role).toBe("MUSIC_LOVER");
    expect(session.session.issuedAt).toBeDefined();
  });

  it("derives user name from email local part", async () => {
    vi.resetModules();
    const { login } = await import("../authClient");
    const session = await login({ email: "john.doe@example.com", password: "pw" });
    expect(session.user.name).toBe("john.doe");
  });

  it("falls back to mixmatch-user when email is empty", async () => {
    vi.resetModules();
    const { login } = await import("../authClient");
    const session = await login({ email: "", password: "pw" });
    expect(session.user.name).toBe("mixmatch-user");
  });
});

describe("login (remote error handling)", () => {
  beforeEach(() => { vi.stubGlobal("fetch", mockFetch); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("throws on network failure", async () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = "http://localhost:3001";
    vi.resetModules();
    const { login: remoteLogin } = await import("../authClient");
    mockFetch.mockRejectedValue(new Error("Network request failed"));
    await expect(remoteLogin(validInput)).rejects.toThrow();
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
  });

  it("throws AuthClientError with kind 'api' on 401", async () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = "http://localhost:3001";
    vi.resetModules();
    const mod = await import("../authClient");
    mockFetch.mockResolvedValue({
      ok: false, status: 401,
      json: async () => ({ success: false, code: "AUTH_INVALID_CREDENTIALS", message: "Invalid email or password" }),
    });
    try { await mod.login(validInput); }
    catch (e) {
      expect(e).toBeInstanceOf(mod.AuthClientError);
      expect((e as InstanceType<typeof mod.AuthClientError>).kind).toBe("api");
      expect((e as InstanceType<typeof mod.AuthClientError>).code).toBe("AUTH_INVALID_CREDENTIALS");
    }
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
  });

  it("throws on non-JSON response", async () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = "http://localhost:3001";
    vi.resetModules();
    const { login: remoteLogin } = await import("../authClient");
    mockFetch.mockResolvedValue({ ok: true, json: async () => { throw new Error("Invalid JSON"); } });
    await expect(remoteLogin(validInput)).rejects.toThrow();
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
  });

  it("throws on unrecognised envelope", async () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = "http://localhost:3001";
    vi.resetModules();
    const { login: remoteLogin } = await import("../authClient");
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { unexpected: true } }) });
    await expect(remoteLogin(validInput)).rejects.toThrow();
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
  });
});
