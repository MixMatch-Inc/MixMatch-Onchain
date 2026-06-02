import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

const mockRequireAuth = vi.fn((req: any, res: any, next: any) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next({
      code: "AUTH_UNAUTHORIZED",
      message: "Unauthorized",
      statusCode: 401,
    });
  }
  res.locals.userId = "user-1";
  res.locals.role = UserRole.DJ;
  next();
});

vi.mock("../../middleware/require-auth.js", () => ({
  requireAuth: (req: unknown, res: unknown, next: unknown) =>
    mockRequireAuth(req, res, next),
  requireRole: () => (_req: unknown, _res: unknown, next: unknown) =>
    (next as () => void)(),
}));

const app = createApiApp();

beforeEach(() => {
  vi.clearAllMocks();
});

describe("email verification and recovery auth contracts", () => {
  it("issues an email-verification challenge with shared ownership-proof shape", async () => {
    const response = await request(app)
      .post("/api/v1/auth/email/verify/request")
      .send({ email: "dj@example.com" });

    expect(response.status).toBe(202);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      requested: true,
      nextStep: "confirm_email_verification",
      challenge: {
        subjectType: "email",
        purpose: "email_verification",
        delivery: "simulated_email",
        codeLength: 6,
      },
    });
  });

  it("confirms email ownership with the issued challenge code", async () => {
    const issued = await request(app)
      .post("/api/v1/auth/email/verify/request")
      .send({ email: "dj@example.com" });

    const response = await request(app)
      .post("/api/v1/auth/email/verify/confirm")
      .send({
        challengeId: issued.body.data.challenge.challengeId,
        code: issued.body.data.challenge.codePreview,
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      verified: true,
      email: "dj@example.com",
      proof: {
        subjectType: "email",
        subject: "dj@example.com",
        purpose: "email_verification",
      },
    });
  });

  it("issues a recovery grant after confirming a recovery challenge", async () => {
    const register = await request(app).post("/api/v1/auth/register").send({
      email: "dj@example.com",
      password: "securepass1",
      role: UserRole.DJ,
    });

    expect(register.status).toBe(201);

    const issued = await request(app)
      .post("/api/v1/auth/recovery/request")
      .send({ email: "dj@example.com", purpose: "session_recovery" });

    const response = await request(app)
      .post("/api/v1/auth/recovery/confirm")
      .send({
        challengeId: issued.body.data.challenge.challengeId,
        code: issued.body.data.challenge.codePreview,
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      recovered: true,
      grant: {
        recoveryToken: expect.stringMatching(/^recovery\./),
        proof: {
          subjectType: "email",
          purpose: "session_recovery",
        },
      },
    });
  });

  it("resets the password with a valid recovery grant", async () => {
    await request(app).post("/api/v1/auth/register").send({
      email: "reset@example.com",
      password: "securepass1",
      role: UserRole.DJ,
    });

    const issued = await request(app)
      .post("/api/v1/auth/recovery/request")
      .send({ email: "reset@example.com", purpose: "account_recovery" });

    const confirmed = await request(app)
      .post("/api/v1/auth/recovery/confirm")
      .send({
        challengeId: issued.body.data.challenge.challengeId,
        code: issued.body.data.challenge.codePreview,
      });

    const reset = await request(app)
      .post("/api/v1/auth/recovery/reset-password")
      .send({
        recoveryToken: confirmed.body.data.grant.recoveryToken,
        newPassword: "brandnewpass9",
      });

    expect(reset.status).toBe(200);
    expect(reset.body.data).toMatchObject({
      passwordReset: true,
      email: "reset@example.com",
    });
  });

  it("rejects password reset when the recovery token is invalid", async () => {
    const response = await request(app)
      .post("/api/v1/auth/recovery/reset-password")
      .send({
        recoveryToken: "recovery.invalid",
        newPassword: "brandnewpass9",
      });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      code: "AUTH_INVALID_RECOVERY_TOKEN",
      message: "Invalid or expired recovery token",
    });
  });

  it("rejects ownership-proof confirmation when the code is wrong", async () => {
    const issued = await request(app)
      .post("/api/v1/auth/ownership-proof/request")
      .send({
        subjectType: "email",
        subject: "dj@example.com",
        purpose: "account_recovery",
      });

    const response = await request(app)
      .post("/api/v1/auth/ownership-proof/confirm")
      .send({
        challengeId: issued.body.data.challenge.challengeId,
        code: "000000",
      });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      code: "AUTH_INVALID_OWNERSHIP_PROOF",
      message: "Invalid or expired ownership proof challenge",
    });
  });
});
