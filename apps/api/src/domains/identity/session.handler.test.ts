import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApiApp } from "../../app.js";
import { UserRole } from "@themixmatch/types";

const mockRefreshSession = vi.fn();
const mockIntrospectSession = vi.fn();
const mockLogoutSession = vi.fn();

vi.mock("./session.service.js", () => ({
  refreshSession: (...args: unknown[]) => mockRefreshSession(...args),
  introspectSession: (...args: unknown[]) => mockIntrospectSession(...args),
  logoutSession: (...args: unknown[]) => mockLogoutSession(...args),
}));

const mockRequireAuth = vi.fn((req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next({ code: "AUTH_UNAUTHORIZED", message: "Unauthorized", statusCode: 401 });
  }
  res.locals.userId = "user-1";
  res.locals.role = UserRole.DJ;
  next();
});

vi.mock("../../middleware/require-auth.js", () => ({
  requireAuth: (req: unknown, res: unknown, next: unknown) => mockRequireAuth(req, res, next),
  requireRole: () => (_req: unknown, _res: unknown, next: unknown) => (next as () => void)(),
}));

const app = createApiApp();

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/v1/auth/refresh", () => {
  it("returns a rotated token pair on success", async () => {
    mockRefreshSession.mockResolvedValue({
      accessToken: "new.access.token",
      refreshToken: "new.refresh.token",
      expiresAt: "2026-06-01T12:15:00.000Z",
    });

    const response = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: "old.refresh.token" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        accessToken: "new.access.token",
        refreshToken: "new.refresh.token",
        expiresAt: "2026-06-01T12:15:00.000Z",
      },
    });
  });

  it("returns 422 when refreshToken is missing", async () => {
    const response = await request(app).post("/api/v1/auth/refresh").send({});

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
  });
});

describe("GET /api/v1/auth/introspect", () => {
  it("returns valid claims when the access token is accepted", async () => {
    mockIntrospectSession.mockReturnValue({
      valid: true,
      userId: "user-1",
      role: UserRole.DJ,
      expiresAt: "2026-06-01T12:15:00.000Z",
    });

    const response = await request(app)
      .get("/api/v1/auth/introspect")
      .set("Authorization", "Bearer valid.access.token");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        valid: true,
        userId: "user-1",
        role: UserRole.DJ,
        expiresAt: "2026-06-01T12:15:00.000Z",
      },
    });
  });

  it("returns 401 when Authorization header is missing", async () => {
    const response = await request(app).get("/api/v1/auth/introspect");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});

describe("POST /api/v1/auth/logout", () => {
  it("returns loggedOut on success", async () => {
    mockLogoutSession.mockResolvedValue({ loggedOut: true });

    const response = await request(app)
      .post("/api/v1/auth/logout")
      .send({ refreshToken: "refresh.token" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: { loggedOut: true } });
  });
});
