import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import { checkAuthThrottle, recordAuthFailure, _throttleStore } from "./auth-throttle.js";
import { sendError } from "../utils/api-response.js";

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.post("/login", checkAuthThrottle, (_req, res) => {
    res.json({ success: true });
  });
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
  _throttleStore.clear();
  vi.restoreAllMocks();
});

describe("checkAuthThrottle", () => {
  it("allows requests when no lockout is active", async () => {
    const app = createTestApp();
    const res = await request(app).post("/login").send({ email: "user@example.com", password: "pw" });
    expect(res.status).toBe(200);
  });

  it("blocks requests when a lockout is active for the email", async () => {
    const app = createTestApp();
    const fakeReq = { body: { email: "locked@example.com" }, ip: "1.2.3.4" } as express.Request;

    // Record enough failures to trigger lockout
    for (let i = 0; i < 5; i++) {
      recordAuthFailure(fakeReq);
    }

    const res = await request(app)
      .post("/login")
      .send({ email: "locked@example.com", password: "wrong" });

    expect(res.status).toBe(429);
    expect(res.body.code).toBe("AUTH_RATE_LIMITED");
    expect(res.body.throttle.throttled).toBe(true);
    expect(res.body.cooldown.active).toBe(true);
    expect(typeof res.body.cooldown.resetAt).toBe("string");
    expect(res.headers["retry-after"]).toBeDefined();
  });

  it("includes attemptsRemaining before lockout", () => {
    const fakeReq = { body: { email: "test@example.com" }, ip: "1.2.3.4" } as express.Request;
    const notice = recordAuthFailure(fakeReq);
    expect(notice.throttled).toBe(false);
    expect(notice.attemptsRemaining).toBe(4);
  });

  it("returns throttled notice after lockout threshold", () => {
    const fakeReq = { body: { email: "test2@example.com" }, ip: "1.2.3.4" } as express.Request;
    for (let i = 0; i < 5; i++) {
      recordAuthFailure(fakeReq);
    }
    const notice = recordAuthFailure(fakeReq);
    expect(notice.throttled).toBe(true);
    expect(notice.attemptsRemaining).toBe(0);
    expect(typeof notice.retryAfter).toBe("number");
    expect(notice.retryAfter).toBeGreaterThan(0);
  });
});

describe("checkAuthThrottle — happy path stays clear", () => {
  it("does not throttle distinct credentials independently", async () => {
    const app = createTestApp();
    const fakeReq = { body: { email: "other@example.com" }, ip: "5.6.7.8" } as express.Request;
    for (let i = 0; i < 5; i++) {
      recordAuthFailure(fakeReq);
    }

    // Different email — should not be throttled
    const res = await request(app)
      .post("/login")
      .send({ email: "different@example.com", password: "pass" });

    expect(res.status).toBe(200);
  });
});

describe("auth throttle integration — login route", () => {
  it("returns throttle envelope on 429 from login route after lockout", async () => {
    const { createApiApp } = await import("../app.js");
    const app = createApiApp();

    // Seed the lockout
    const fakeReq = { body: { email: "abuse@example.com" }, ip: "9.9.9.9" } as express.Request;
    for (let i = 0; i < 5; i++) {
      recordAuthFailure(fakeReq);
    }

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "abuse@example.com", password: "irrelevant" });

    expect(res.status).toBe(429);
    expect(res.body.throttle.throttled).toBe(true);
    expect(res.body.cooldown.active).toBe(true);
  });
});
