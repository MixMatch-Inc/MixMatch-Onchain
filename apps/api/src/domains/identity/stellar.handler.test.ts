import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApiApp } from "../../app.js";

const mockGetStellarHandshake = vi.fn();

vi.mock("../../services/stellar.service.js", () => ({
  getStellarHandshake: (...args: unknown[]) => mockGetStellarHandshake(...args),
}));

const app = createApiApp();

beforeEach(() => {
  vi.clearAllMocks();
  mockGetStellarHandshake.mockResolvedValue({
    service: "stellar-service",
    status: "ok",
    supportedWallets: ["phantom", "freighter"],
    networkPassphrase: "Test SDF Network ; September 2015",
    horizonUrl: "https://horizon-testnet.stellar.org",
    timestamp: new Date().toISOString(),
  });
});

describe("GET /api/v1/auth/handshake", () => {
  it("returns the handshake metadata from the stellar service", async () => {
    const response = await request(app).get("/api/v1/auth/handshake");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: expect.objectContaining({
        service: "stellar-service",
        status: "ok",
        supportedWallets: expect.arrayContaining(["phantom", "freighter"]),
      }),
    });
  });
});
