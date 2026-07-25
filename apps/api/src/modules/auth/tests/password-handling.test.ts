import request from "supertest";
import { describe, expect, it } from "vitest";
import { createTestApp } from "./test-app.js";
import { PASSWORD_POLICY } from "@mixmatch/shared";

/**
 * Password handling — regression coverage and hardened edge cases.
 *
 * Track: password handling  |  Sprint 1
 * Issues: #789 (implement), #790 (regression), #791 (harden)
 *
 * Tests are grouped by the edge-case table in
 * packages/shared/src/types/password-policy.ts.
 */

describe("Password handling — registration constraints (regression)", () => {
  it("accepts a password of exactly 8 characters", async () => {
    const app = createTestApp();
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "min8@example.com", password: "12345678" });
    expect(res.status).toBe(201);
  });

  it("rejects a password of 7 characters (below min)", async () => {
    const app = createTestApp();
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "min7@example.com", password: "1234567" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("accepts passwords with leading and trailing whitespace", async () => {
    const app = createTestApp();
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "whitespace@example.com", password: "  password  " });
    expect(res.status).toBe(201);
  });

  it("accepts a whitespace-only password of 8+ characters", async () => {
    const app = createTestApp();
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "spaces-only@example.com", password: "        " }); // 8 spaces
    expect(res.status).toBe(201);
  });

  it("accepts a password with special characters", async () => {
    const app = createTestApp();
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "special@example.com", password: "p@ssw0rd!" });
    expect(res.status).toBe(201);
  });

  it("accepts a password with unicode characters", async () => {
    const app = createTestApp();
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "unicode@example.com", password: "pässwörد123" });
    expect(res.status).toBe(201);
  });

  it("rejects an empty password on registration", async () => {
    const app = createTestApp();
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "empty-pw@example.com", password: "" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("Password handling — login constraints (regression)", () => {
  it("accepts a 1-character password on login", async () => {
    const app = createTestApp();
    const email = "login-1char@example.com";
    await request(app)
      .post("/api/auth/register")
      .send({ email, password: "password123" });

    // Login with wrong 1-char password should give 401, not 400
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "x" });

    // Single-char password is VALID input for login — gives 401, not 400
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects an empty password on login", async () => {
    const app = createTestApp();
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@example.com", password: "" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("verifies the correct password against a whitespace-padded registration", async () => {
    const app = createTestApp();
    const email = "ws-login@example.com";
    const password = "  password  ";
    await request(app).post("/api/auth/register").send({ email, password });

    // Must match with the exact same whitespace (server does not trim)
    const correct = await request(app)
      .post("/api/auth/login")
      .send({ email, password });
    expect(correct.status).toBe(200);

    // Trimmed version should NOT match
    const trimmed = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "password" });
    expect(trimmed.status).toBe(401);
  });
});

describe("Password handling — security invariants (issue #791 harden)", () => {
  it("does not expose passwordHash in register response", async () => {
    const app = createTestApp();
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "hash-check@example.com", password: "password123" });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.user.password).toBeUndefined();
  });

  it("does not expose passwordHash in login response", async () => {
    const app = createTestApp();
    const email = "hash-login@example.com";
    await request(app).post("/api/auth/register").send({ email, password: "password123" });
    const res = await request(app).post("/api/auth/login").send({ email, password: "password123" });
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it("returns the same error for non-existent email and wrong password (no enumeration)", async () => {
    const app = createTestApp();
    await request(app)
      .post("/api/auth/register")
      .send({ email: "real@example.com", password: "password123" });

    const wrongEmail = await request(app)
      .post("/api/auth/login")
      .send({ email: "ghost@example.com", password: "password123" });

    const wrongPw = await request(app)
      .post("/api/auth/login")
      .send({ email: "real@example.com", password: "wrongpassword" });

    expect(wrongEmail.status).toBe(401);
    expect(wrongPw.status).toBe(401);
    expect(wrongEmail.body.error.message).toBe(wrongPw.body.error.message);
    expect(wrongEmail.body.error.code).toBe(wrongPw.body.error.code);
  });

  it("BCRYPT_ROUNDS constant is 10 or higher", () => {
    expect(PASSWORD_POLICY.BCRYPT_ROUNDS).toBeGreaterThanOrEqual(10);
  });

  it("rate-limits repeated failed login attempts after 5 failures", async () => {
    const app = createTestApp();
    const email = "brute-force@example.com";
    await request(app)
      .post("/api/auth/register")
      .send({ email, password: "password123" });

    let lastRes: Awaited<ReturnType<typeof request.agent>> | undefined;
    for (let i = 0; i < 6; i++) {
      lastRes = await request(app)
        .post("/api/auth/login")
        .send({ email, password: "wrong" });
    }

    expect(lastRes?.status).toBe(429);
    expect(lastRes?.body.error.code).toBe("RATE_LIMITED");
  });
});
