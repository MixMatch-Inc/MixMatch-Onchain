import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createTestApp } from "./test-app.js";

const JWT_SECRET =
  process.env.JWT_SECRET ?? "dev-secret-change-me-abcdefghijklmnopqrstuvwxyz123";

/**
 * Hardened edge-case tests for GET /api/auth/me.
 * Covers failure modes not already addressed in me.test.ts.
 *
 * Track: me endpoint  |  Sprint 1  |  issue #776 (harden edge cases)
 */
describe("GET /api/auth/me — hardened edge cases", () => {
  it("returns 401 when Authorization header is present but value is empty string", async () => {
    const app = createTestApp();
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_TOKEN");
  });

  it("returns 401 when Bearer token is only whitespace", async () => {
    const app = createTestApp();
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer    ");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_TOKEN");
  });

  it("returns 401 when token is signed with a different secret", async () => {
    const app = createTestApp();
    const token = jwt.sign({ sub: "user-id" }, "wrong-secret-that-is-long-enough");
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_TOKEN");
  });

  it("returns 401 when token algorithm is none (alg:none attack)", async () => {
    const app = createTestApp();
    // Craft a token with alg:none — should be rejected
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ sub: "user-id", exp: 9999999999 })).toString("base64url");
    const noneToken = `${header}.${payload}.`;
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${noneToken}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_TOKEN");
  });

  it("returns 401 when token has no sub claim", async () => {
    const app = createTestApp();
    const token = jwt.sign({ role: "USER" }, JWT_SECRET); // no sub
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_TOKEN");
  });

  it("does not expose passwordHash or internal fields in the response", async () => {
    const app = createTestApp();
    const credentials = { email: "me-harden@example.com", password: "password123" };
    const regRes = await request(app).post("/api/auth/register").send(credentials);
    const { accessToken } = regRes.body;

    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(meRes.status).toBe(200);
    const user = meRes.body.user;
    expect(user.passwordHash).toBeUndefined();
    expect(user.password).toBeUndefined();
    // Only safe fields exposed
    expect(user.email).toBe(credentials.email);
    expect(user.id).toBeDefined();
    expect(user.role).toBeDefined();
  });

  it("responds with correct Content-Type (application/json)", async () => {
    const app = createTestApp();
    const res = await request(app).get("/api/auth/me");
    expect(res.headers["content-type"]).toMatch(/application\/json/);
  });
});
