import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { authenticateAccount } from "./login.service.js";
import { UserRole } from "@themixmatch/types";
import { AuthError } from "../../utils/errors.js";

// ---------------------------------------------------------------------------
// Shared stubs
// ---------------------------------------------------------------------------

const mockFindByEmail = vi.fn();
const mockCompare = vi.fn();

vi.mock("../../config/di", () => ({
  container: {
    userRepository: {
      findByEmail: (...args: unknown[]) => mockFindByEmail(...args),
    },
    refreshTokenRepository: {
      save: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

vi.mock("bcryptjs", () => ({
  compare: (...args: unknown[]) => mockCompare(...args),
}));

vi.mock("../../services/jwt.service", () => ({
  generateAccessToken: () => "test.jwt.token",
  generateRefreshToken: () => ({ token: "test.refresh.token", jti: "test-jti" }),
}));

const fakeUser = {
  id: "user-1",
  name: "dj",
  email: "dj@example.com",
  role: UserRole.DJ,
  passwordHash: bcrypt.hashSync("securepass1", 10),
  onboardingCompleted: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const validInput = {
  email: "dj@example.com",
  password: "securepass1",
};

// ---------------------------------------------------------------------------
// authenticateAccount – happy & failure paths
// ---------------------------------------------------------------------------

describe("authenticateAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindByEmail.mockResolvedValue(fakeUser);
    mockCompare.mockResolvedValue(true);
  });

  it("returns a token and user payload when credentials are valid", async () => {
    const result = await authenticateAccount(validInput);

    expect(result.token).toBe("test.jwt.token");
    expect(result.refreshToken).toBe("test.refresh.token");
    expect(result.user.email).toBe("dj@example.com");
    expect(result.user.role).toBe(UserRole.DJ);
    expect(result.user.onboardingCompleted).toBe(false);
  });

  it("normalises email to lowercase before lookup", async () => {
    await authenticateAccount({ email: "DJ@Example.COM", password: "securepass1" });
    expect(mockFindByEmail).toHaveBeenCalledWith("dj@example.com");
  });

  it("throws invalid credentials when the user does not exist", async () => {
    mockFindByEmail.mockResolvedValue(null);

    await expect(authenticateAccount(validInput)).rejects.toMatchObject({
      code: AuthError.invalidCredentials().code,
      statusCode: 401,
    });
  });

  it("throws invalid credentials when the password is incorrect", async () => {
    mockCompare.mockResolvedValue(false);

    await expect(authenticateAccount(validInput)).rejects.toMatchObject({
      code: AuthError.invalidCredentials().code,
      statusCode: 401,
    });
  });

  it("throws invalid credentials for empty password", async () => {
    await expect(authenticateAccount({ email: "dj@example.com", password: "" })).rejects.toMatchObject({
      code: AuthError.invalidCredentials().code,
      statusCode: 401,
    });
  });
});

