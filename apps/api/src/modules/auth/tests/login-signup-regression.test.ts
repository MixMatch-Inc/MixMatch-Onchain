import request from "supertest";
import { describe, expect, it } from "vitest";
import { createTestApp } from "./test-app.js";

/**
 * Login flow — regression & edge-case coverage.
 *
 * Track: login flow | signup flow  |  Sprint 1
 * Issues: #769 (implement), #770 (regression), #767 (signup integrate/document)
 *
 * Covers the edge cases documented in packages/shared/src/types/login-contract.ts.
 */

describe("POST /api/auth/login — regression coverage", () => {
  // ── Happy path ─────────────────────────────────────────────────────────────

  it("returns 200 with user, accessToken, and refreshToken on valid credentials", async () => {
    const app = createTestApp();
    const email = "login-regression@example.com";
    await request(app).post("/api/auth/register").send({ email, password: "password123" });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(email);
    expect(typeof res.body.accessToken).toBe("string");
    expect(typeof res.body.refreshToken).toBe("string");
  });

  it("does not expose passwordHash in the login response", async () => {
    const app = createTestApp();
    const email = "no-hash@example.com";
    await request(app).post("/api/auth/register").send({ email, password: "password123" });

    const res = await request(app).post("/api/auth/login").send({ email, password: "password123" });

    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.user.password).toBeUndefined();
  });

  // ── Authentication failures ─────────────────────────────────────────────────

  it("returns 401 for a non-existent email", async () => {
    const app = createTestApp();
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ghost@example.com", password: "password123" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 for an existing email with the wrong password", async () => {
    const app = createTestApp();
    const email = "wrong-pw@example.com";
    await request(app).post("/api/auth/register").send({ email, password: "password123" });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "wrongpassword" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns the same error message for non-existent email and wrong password (no enumeration)", async () => {
    const app = createTestApp();
    const email = "real-user@example.com";
    await request(app).post("/api/auth/register").send({ email, password: "password123" });

    const wrongEmail = await request(app)
      .post("/api/auth/login")
      .send({ email: "fake@example.com", password: "password123" });

    const wrongPw = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "wrongpassword" });

    expect(wrongEmail.body.error.message).toBe(wrongPw.body.error.message);
  });

  // ── Validation failures ─────────────────────────────────────────────────────

  it("returns 400 for an empty password", async () => {
    const app = createTestApp();
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@example.com", password: "" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for an invalid email format", async () => {
    const app = createTestApp();
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "not-an-email", password: "password123" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when the request body is missing", async () => {
    const app = createTestApp();
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/auth/register — signup integration", () => {
  it("returns 201 with user, accessToken, and refreshToken", async () => {
    const app = createTestApp();
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "signup-new@example.com", password: "password123" });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("signup-new@example.com");
    expect(typeof res.body.accessToken).toBe("string");
  });

  it("returns 409 when email is already registered", async () => {
    const app = createTestApp();
    const body = { email: "duplicate@example.com", password: "password123" };
    await request(app).post("/api/auth/register").send(body);
    const res = await request(app).post("/api/auth/register").send(body);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("returns 400 when password is shorter than 8 characters", async () => {
    const app = createTestApp();
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "short-pw@example.com", password: "short" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
