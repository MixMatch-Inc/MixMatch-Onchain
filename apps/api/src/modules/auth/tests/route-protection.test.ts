import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createTestApp } from "./test-app.js";

const JWT_SECRET =
  process.env.JWT_SECRET ?? "dev-secret-change-me-abcdefghijklmnopqrstuvwxyz123";

/**
 * Route protection — core flow and hardened edge cases.
 *
 * Track: route protection | token persistence  |  Sprint 1
 * Issues: #783 (define), #784 (implement), #786 (harden), #781 (token persistence harden)
 */

// ---------------------------------------------------------------------------
// Public routes — no token required
// ---------------------------------------------------------------------------
describe("Public routes (no auth)", () => {
  it("POST /api/auth/register is accessible without a token", async () => {
    const app = createTestApp();
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "public-test@example.com", password: "password123" });
    expect(res.status).toBe(201);
  });

  it("POST /api/auth/login is accessible without a token", async () => {
    const app = createTestApp();
    await request(app)
      .post("/api/auth/register")
      .send({ email: "public-login@example.com", password: "password123" });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "public-login@example.com", password: "password123" });
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Authenticated routes — requireAuth middleware
// ---------------------------------------------------------------------------
describe("Authenticated routes (requireAuth)", () => {
  it("GET /api/auth/me blocks unauthenticated requests with 401", async () => {
    const app = createTestApp();
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_TOKEN");
  });

  it("GET /api/auth/me returns 200 with a valid token", async () => {
    const app = createTestApp();
    const reg = await request(app)
      .post("/api/auth/register")
      .send({ email: "auth-route@example.com", password: "password123" });

    const me = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${reg.body.accessToken}`);

    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe("auth-route@example.com");
  });
});

// ---------------------------------------------------------------------------
// Role-based routes — requireRole
// ---------------------------------------------------------------------------
describe("Role-based routes (requireRole)", () => {
  it("GET /api/auth/admin/users returns 403 for non-admin token", async () => {
    const app = createTestApp();
    const reg = await request(app)
      .post("/api/auth/register")
      .send({ email: "user-no-admin@example.com", password: "password123" });

    const res = await request(app)
      .get("/api/auth/admin/users")
      .set("Authorization", `Bearer ${reg.body.accessToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("INSUFFICIENT_PERMISSIONS");
  });

  it("GET /api/auth/admin/users returns 401 without a token", async () => {
    const app = createTestApp();
    const res = await request(app).get("/api/auth/admin/users");
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Ownership routes — allowOwnership
// ---------------------------------------------------------------------------
describe("Ownership routes (allowOwnership)", () => {
  it("PUT /api/auth/profile/:id returns 403 when id does not match token owner", async () => {
    const app = createTestApp();
    const reg = await request(app)
      .post("/api/auth/register")
      .send({ email: "owner-test@example.com", password: "password123" });

    const differentId = "00000000-0000-0000-0000-000000000001";
    const res = await request(app)
      .put(`/api/auth/profile/${differentId}`)
      .set("Authorization", `Bearer ${reg.body.accessToken}`)
      .send({ email: "new@example.com" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("INSUFFICIENT_PERMISSIONS");
  });

  it("PUT /api/auth/profile/:id succeeds when id matches token owner", async () => {
    const app = createTestApp();
    const reg = await request(app)
      .post("/api/auth/register")
      .send({ email: "owner-match@example.com", password: "password123" });

    const userId = reg.body.user.id;
    const res = await request(app)
      .put(`/api/auth/profile/${userId}`)
      .set("Authorization", `Bearer ${reg.body.accessToken}`)
      .send({ email: "owner-match@example.com" });

    // 200 or 404 acceptable; key check is no 403
    expect(res.status).not.toBe(403);
    expect(res.body.error?.code).not.toBe("INSUFFICIENT_PERMISSIONS");
  });
});

// ---------------------------------------------------------------------------
// Token persistence — harden edge cases (issue #781)
// ---------------------------------------------------------------------------
describe("Token persistence — hardened edge cases", () => {
  it("expired token produces 401 TOKEN_EXPIRED on /me", async () => {
    const app = createTestApp();
    const expired = jwt.sign({ sub: "user-id" }, JWT_SECRET, { expiresIn: -1 });
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("TOKEN_EXPIRED");
  });

  it("token without sub produces 401 INVALID_TOKEN", async () => {
    const app = createTestApp();
    const noSub = jwt.sign({ role: "USER" }, JWT_SECRET);
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${noSub}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_TOKEN");
  });
});
