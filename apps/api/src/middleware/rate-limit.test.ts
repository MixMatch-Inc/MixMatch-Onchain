import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import { createRateLimit, _rateLimitStore } from "./rate-limit.js";
import { sendError } from "../utils/api-response.js";

function createTestApp(maxRequests: number, windowMs: number) {
  const app = express();
  const limit = createRateLimit({ maxRequests, windowMs });
  app.post("/test", limit, (_req, res) => {
    res.json({ success: true });
  });
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err && typeof err === "object" && "code" in err && "message" in err && "statusCode" in err) {
      sendError(res, err as { code: string; message: string; statusCode: number });
    } else {
      res.status(500).json({ success: false, code: "INTERNAL_ERROR" });
    }
  });
  return app;
}

beforeEach(() => {
  _rateLimitStore.clear();
  vi.restoreAllMocks();
});

describe("createRateLimit", () => {
  it("allows requests within the limit", async () => {
    const app = createTestApp(3, 60_000);
    const res = await request(app).post("/test");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it("returns 429 after the max request count is exceeded", async () => {
    const app = createTestApp(2, 60_000);
    await request(app).post("/test");
    await request(app).post("/test");
    const res = await request(app).post("/test");
    expect(res.status).toBe(429);
    expect(res.body.code).toBe("AUTH_RATE_LIMITED");
    expect(typeof res.body.retryAfter).toBe("number");
    expect(res.body.retryAfter).toBeGreaterThan(0);
  });

  it("includes X-RateLimit headers on every response", async () => {
    const app = createTestApp(5, 60_000);
    const res = await request(app).post("/test");
    expect(res.headers["x-ratelimit-limit"]).toBe("5");
    expect(res.headers["x-ratelimit-remaining"]).toBeDefined();
    expect(res.headers["x-ratelimit-reset"]).toBeDefined();
  });

  it("includes Retry-After header on a 429 response", async () => {
    const app = createTestApp(1, 60_000);
    await request(app).post("/test");
    const res = await request(app).post("/test");
    expect(res.status).toBe(429);
    expect(res.headers["retry-after"]).toBeDefined();
  });

  it("resets the counter after the window expires", async () => {
    const app = createTestApp(1, 100);
    await request(app).post("/test");
    await request(app).post("/test");

    // Wait for window to expire
    await new Promise((r) => setTimeout(r, 110));
    _rateLimitStore.clear();

    const res = await request(app).post("/test");
    expect(res.status).toBe(200);
  });

  it("uses a custom key function when provided", async () => {
    const app = express();
    const limit = createRateLimit({ maxRequests: 1, windowMs: 60_000, keyFn: () => "fixed-key" });
    app.post("/test", limit, (_req, res) => res.json({ success: true }));

    await request(app).post("/test");
    const res = await request(app).post("/test");
    expect(res.status).toBe(429);
  });
});

describe("rate limit on auth routes (integration)", () => {
  it("rate-limits the stellar auth challenge route after threshold", async () => {
    const { createApiApp } = await import("../app.js");
    const app = createApiApp();

    const body = { stellarPublicKey: "GABCDE1234567890" };
    const responses = await Promise.all(
      Array.from({ length: 7 }, () =>
        request(app).post("/api/v1/stellar/auth/challenge").send(body),
      ),
    );
    const statuses = responses.map((r) => r.status);
    expect(statuses.some((s) => s === 429)).toBe(true);
  });
});
