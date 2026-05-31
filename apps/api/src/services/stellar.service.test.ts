import { describe, it, expect, vi, beforeEach } from "vitest";
import { getStellarHandshake, mapHandshakeToWalletBootstrap, defaultWalletBootstrap } from "./stellar.service.js";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal("fetch", mockFetch as unknown as typeof fetch);
});

describe("getStellarHandshake", () => {
  it("parses a valid handshake payload", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        service: "stellar-service",
        status: "ok",
        supportedWallets: ["phantom", "freighter"],
        networkPassphrase: "Test SDF Network ; September 2015",
        horizonUrl: "https://horizon-testnet.stellar.org",
        timestamp: new Date().toISOString(),
      }),
    });

    const handshake = await getStellarHandshake();
    expect(handshake.service).toBe("stellar-service");
    expect(handshake.supportedWallets).toContain("phantom");
  });

  it("throws when the handshake endpoint is unavailable", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 502, json: async () => ({}) });
    await expect(getStellarHandshake()).rejects.toThrow("Stellar handshake request failed with status 502");
  });
});

describe("mapHandshakeToWalletBootstrap", () => {
  it("maps handshake payload to wallet bootstrap values", () => {
    const wallet = mapHandshakeToWalletBootstrap({
      service: "stellar-service",
      status: "ok",
      supportedWallets: ["phantom", "freighter"],
      networkPassphrase: "Test SDF Network ; September 2015",
      horizonUrl: "https://horizon-testnet.stellar.org",
      timestamp: new Date().toISOString(),
    });

    expect(wallet).toEqual({
      service: "stellar-service",
      status: "unlinked",
      networkPassphrase: "Test SDF Network ; September 2015",
      horizonUrl: "https://horizon-testnet.stellar.org",
      availableWallets: ["phantom", "freighter"],
    });
  });
});

describe("defaultWalletBootstrap", () => {
  it("returns a fallback wallet bootstrap payload", () => {
    const wallet = defaultWalletBootstrap();
    expect(wallet.service).toBe("stellar-service");
    expect(wallet.status).toBe("unlinked");
    expect(wallet.availableWallets).toContain("phantom");
  });
});
