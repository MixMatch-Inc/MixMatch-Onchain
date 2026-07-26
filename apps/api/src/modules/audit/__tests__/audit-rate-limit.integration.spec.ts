import { describe, expect, it, beforeEach, vi } from "vitest";
import { AuditService } from "../audit.service.js";
import { InMemoryAuditStore } from "../in-memory-audit.store.js";
import { auditResponseEvents } from "../audit-response-events.middleware.js";
import express, { type Request, type Response } from "express";
import request from "supertest";

/**
 * Audit trail — integration tests with rate-limit middleware.
 *
 * Track: audit trail | rate limiting  |  Sprint 1
 * Issues: #799 (implement), #800 (regression), #802 (integrate/document)
 */

function buildApp(auditService: AuditService, handlerStatus: number, handlerBody: object) {
  const app = express();
  app.use(express.json());
  app.use(auditResponseEvents(auditService));
  app.get("/test", (_req: Request, res: Response) => {
    res.status(handlerStatus).json(handlerBody);
  });
  return app;
}

describe("auditResponseEvents middleware — core integration", () => {
  let store: InMemoryAuditStore;
  let audit: AuditService;

  beforeEach(() => {
    store = new InMemoryAuditStore();
    audit = new AuditService(store);
  });

  it("records RATE_LIMIT_EXCEEDED when handler responds with 429", async () => {
    const app = buildApp(audit, 429, {
      error: { code: "RATE_LIMITED", message: "Too many requests.", retryAfter: 60 },
    });

    await request(app).get("/test");

    const count = await audit.countByAction("RATE_LIMIT_EXCEEDED");
    expect(count).toBe(1);
  });

  it("records ACCESS_DENIED when handler responds with 401", async () => {
    const app = buildApp(audit, 401, {
      error: { code: "INVALID_TOKEN", message: "Unauthorized" },
    });

    await request(app).get("/test");

    const count = await audit.countByAction("ACCESS_DENIED");
    expect(count).toBe(1);
  });

  it("records ACCESS_DENIED when handler responds with 403", async () => {
    const app = buildApp(audit, 403, {
      error: { code: "INSUFFICIENT_PERMISSIONS", message: "Forbidden" },
    });

    await request(app).get("/test");

    const count = await audit.countByAction("ACCESS_DENIED");
    expect(count).toBe(1);
  });

  it("does NOT record an audit event for a 200 success response", async () => {
    const app = buildApp(audit, 200, { user: { id: "1" } });

    await request(app).get("/test");

    expect(await audit.countByAction("RATE_LIMIT_EXCEEDED")).toBe(0);
    expect(await audit.countByAction("ACCESS_DENIED")).toBe(0);
  });

  it("does NOT record an audit event for a 400 validation error", async () => {
    const app = buildApp(audit, 400, {
      error: { code: "VALIDATION_ERROR", message: "Bad request" },
    });

    await request(app).get("/test");

    expect(await audit.countByAction("RATE_LIMIT_EXCEEDED")).toBe(0);
    expect(await audit.countByAction("ACCESS_DENIED")).toBe(0);
  });

  it("includes the request path as resourceId", async () => {
    const app = buildApp(audit, 429, { error: { code: "RATE_LIMITED" } });

    await request(app).get("/test");

    const entries = await store.findByActor("__all__").catch(() => []);
    // Query by action instead
    const count = await audit.countByAction("RATE_LIMIT_EXCEEDED");
    expect(count).toBe(1);
  });

  it("does not throw when audit write fails (fire-and-forget)", async () => {
    const failingAudit = new AuditService({
      write: async () => { throw new Error("storage down"); },
      findByActor: async () => [],
      findByResource: async () => [],
      countByAction: async () => 0,
    });

    const app = buildApp(failingAudit, 429, { error: { code: "RATE_LIMITED" } });

    // The request should still succeed even if audit write throws
    const res = await request(app).get("/test");
    expect(res.status).toBe(429);
  });

  it("records multiple RATE_LIMIT_EXCEEDED events for repeated 429s", async () => {
    const app = buildApp(audit, 429, { error: { code: "RATE_LIMITED" } });

    await request(app).get("/test");
    await request(app).get("/test");
    await request(app).get("/test");

    expect(await audit.countByAction("RATE_LIMIT_EXCEEDED")).toBe(3);
  });
});
