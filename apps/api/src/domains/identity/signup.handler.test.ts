import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApiApp } from "../../app.js";
import { UserRole } from "@themixmatch/types";
import { AuthError } from "../../utils/errors.js";

const mockCreateAccount = vi.fn();
const mockBuildSessionBootstrap = vi.fn();

vi.mock("./signup.service.js", () => ({
  createAccount: (...args: unknown[]) => mockCreateAccount(...args),
  buildSessionBootstrap: (...args: unknown[]) => mockBuildSessionBootstrap(...args),
}));

const app = createApiApp();

beforeEach(() => {
  vi.clearAllMocks();
  mockBuildSessionBootstrap.mockReturnValue({
    userId: "user-1",
    role: UserRole.DJ,
    onboardingCompleted: false,
    issuedAt: new Date().toISOString(),
    wallet: {
      service: "stellar-service",
      status: "unlinked",
      networkPassphrase: "Test SDF Network ; September 2015",
      horizonUrl: "https://horizon-testnet.stellar.org",
      availableWallets: ["phantom", "freighter"],
    },
  });
});

describe("POST /api/v1/auth/register", () => {
  it("returns 201 with token, user, and session payload on success", async () => {
    mockCreateAccount.mockResolvedValue({
      token: "test.jwt.token",
      user: {
        id: "user-1",
        name: "dj",
        email: "dj@example.com",
        role: UserRole.DJ,
        onboardingCompleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "dj@example.com", password: "securepass1", role: UserRole.DJ })
      .set("Accept", "application/json");

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      success: true,
      data: {
        token: "test.jwt.token",
        user: expect.objectContaining({
          email: "dj@example.com",
          role: UserRole.DJ,
        }),
        session: expect.objectContaining({
          userId: "user-1",
          wallet: expect.objectContaining({
            service: "stellar-service",
          }),
        }),
      },
    });
  });

  it("returns 409 when email is already registered", async () => {
    mockCreateAccount.mockRejectedValue(AuthError.emailAlreadyExists("dj@example.com"));

    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "dj@example.com", password: "securepass1", role: UserRole.DJ })
      .set("Accept", "application/json");

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      success: false,
      code: "AUTH_EMAIL_EXISTS",
      message: "Email dj@example.com is already registered",
    });
  });

  it("returns 422 for invalid body payload", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "not-an-email", password: "short", role: "UNKNOWN" })
      .set("Accept", "application/json");

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      success: false,
      code: "VALIDATION_INVALID_INPUT",
      message: expect.stringContaining("Validation failed"),
    });
  });
});
