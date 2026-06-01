import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import { stellarAuthChallengeHandler, stellarAuthVerifyHandler } from "./stellar-auth.handler.js";
import { sendError } from "../../utils/api-response.js";

const mockFetch = vi.fn();

vi.stubGlobal("fetch", mockFetch as unknown as typeof fetch);

vi.mock("../../middleware/audit-log.js", () => ({
  logAuthEvent: vi.fn(),
}));

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.post("/stellar/challenge", stellarAuthChallengeHandler);
  app.post("/stellar/verify", stellarAuthVerifyHandler);
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err && typeof err === "object" && "code" in err && "message" in err && "statusCode" in err) {
      sendError(res, err as { code: string; message: string; statusCode: number });
    } else {
      res.status(500).json({ success: false });
    }
  });
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Challenge handler
// ---------------------------------------------------------------------------

describe("stellarAuthChallengeHandler", () => {
  it("returns 422 when stellarPublicKey is missing", async () => {
    const app = createTestApp();
    const res = await request(app).post("/stellar/challenge").send({});
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("proxies the stellar-service response on success", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          transactionXdr: "AAAA",
          networkPassphrase: "Test SDF Network ; September 2015",
          expiresAt: new Date().toISOString(),
        },
      }),
    });

    const app = createTestApp();
    const res = await request(app)
      .post("/stellar/challenge")
      .send({ stellarPublicKey: "GABCDEFGHIJK" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.transactionXdr).toBe("AAAA");
  });

  it("returns 502 with a StellarAuthRiskNotice when the stellar-service is unavailable", async () => {
    mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const app = createTestApp();
    const res = await request(app)
      .post("/stellar/challenge")
      .send({ stellarPublicKey: "GABCDEFGHIJK" });

    expect(res.status).toBe(502);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe("STELLAR_SERVICE_UNAVAILABLE");
    expect(res.body.notice.type).toBe("service_unavailable");
    expect(res.body.notice.action).toBe("retry_later");
  });
});

// ---------------------------------------------------------------------------
// Verify handler
// ---------------------------------------------------------------------------

describe("stellarAuthVerifyHandler", () => {
  it("returns 422 when required fields are missing", async () => {
    const app = createTestApp();
    const res = await request(app).post("/stellar/verify").send({});
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it("proxies the stellar-service response on successful verification", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { verified: true, stellarAccountId: "GABCDEF", linkedAt: new Date().toISOString() },
      }),
    });

    const app = createTestApp();
    const res = await request(app)
      .post("/stellar/verify")
      .send({ sessionToken: "eyJhbGciOiJIUzI1NiJ9.test", stellarPublicKey: "GABCDEF" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.verified).toBe(true);
  });

  it("attaches a session_risk notice when stellar-service returns an error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ success: false, code: "AUTH_INVALID_SESSION", message: "Bad session" }),
    });

    const app = createTestApp();
    const res = await request(app)
      .post("/stellar/verify")
      .send({ sessionToken: "bad-token", stellarPublicKey: "GABCDEF" });

    expect(res.status).toBe(401);
    expect(res.body.notice.type).toBe("session_risk");
    expect(res.body.notice.action).toBe("re_authenticate");
  });

  it("returns 502 with service_unavailable notice when stellar-service is down", async () => {
    mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const app = createTestApp();
    const res = await request(app)
      .post("/stellar/verify")
      .send({ sessionToken: "eyJtest", stellarPublicKey: "GABCDEF" });

    expect(res.status).toBe(502);
    expect(res.body.notice.type).toBe("service_unavailable");
    expect(res.body.notice.action).toBe("retry_later");
  });
});
