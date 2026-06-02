import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStellarServiceApp } from "./index.js";

describe("stellar-service auth boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("verifies a supported session token and Stellar public key", async () => {
    const app = createStellarServiceApp();
    const response = await request(app)
      .post("/api/v1/stellar/auth/verify")
      .send({
        sessionToken: "local.session-token",
        stellarPublicKey:
          "GCPAWJZXQ6HLJTWK7K2Q6KH3WNOLEQW2M6OGFJQ7E4M6KXPTHVZ4S5PX",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        verified: true,
        stellarAccountId:
          "GCPAWJZXQ6HLJTWK7K2Q6KH3WNOLEQW2M6OGFJQ7E4M6KXPTHVZ4S5PX",
      }),
    );
  });

  it("rejects an unsupported session token before wallet linking proceeds", async () => {
    const app = createStellarServiceApp();
    const response = await request(app)
      .post("/api/v1/stellar/auth/verify")
      .send({
        sessionToken: "not-a-session-token",
        stellarPublicKey:
          "GCPAWJZXQ6HLJTWK7K2Q6KH3WNOLEQW2M6OGFJQ7E4M6KXPTHVZ4S5PX",
      });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      code: "AUTH_INVALID_SESSION",
      message: "Invalid session token",
    });
  });
});
