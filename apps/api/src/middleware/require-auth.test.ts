import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import { UserRole } from "@themixmatch/types";
import { requireAuth, requireRole } from "./require-auth.js";
import { sendError } from "../utils/api-response.js";

const mockVerifyAccessToken = vi.fn();

vi.mock("../services/jwt.service.js", () => ({
  verifyAccessToken: (...args: unknown[]) => mockVerifyAccessToken(...args),
}));

function createTestApp() {
  const app = express();
  app.get("/protected", requireAuth, (_req, res) => {
    res.json({ ok: true, userId: res.locals.userId, role: res.locals.role });
  });
  app.get("/dj-only", requireAuth, requireRole(UserRole.DJ), (_req, res) => {
    res.json({ ok: true });
  });
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err && typeof err === "object" && "code" in err && "message" in err && "statusCode" in err) {
      sendError(res, err as { code: string; message: string; statusCode: number });
    } else {
      sendError(res, { code: "INTERNAL_ERROR", message: "Unexpected error", statusCode: 500 });
    }
  });
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireAuth", () => {
  it("allows access when the bearer token is valid", async () => {
    mockVerifyAccessToken.mockReturnValue({ userId: "user-1", role: UserRole.DJ });
    const app = createTestApp();

    const response = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer valid.token");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, userId: "user-1", role: UserRole.DJ });
  });

  it("returns 401 when Authorization header is missing", async () => {
    const app = createTestApp();

    const response = await request(app).get("/protected");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it("returns 401 when the bearer token is invalid", async () => {
    mockVerifyAccessToken.mockImplementation(() => {
      throw new Error("invalid token");
    });
    const app = createTestApp();

    const response = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer bad.token");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});

describe("requireRole", () => {
  it("returns 401 when the user role is not allowed", async () => {
    mockVerifyAccessToken.mockReturnValue({ userId: "user-1", role: UserRole.MUSIC_LOVER });
    const app = createTestApp();

    const response = await request(app)
      .get("/dj-only")
      .set("Authorization", "Bearer valid.token");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
