import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { authenticate, buildLoginSession } from "./login.service.js";
import { UserRole } from "@themixmatch/types";
import { ApiError } from "../../utils/errors.js";

// ---------------------------------------------------------------------------
// Shared stubs
// ---------------------------------------------------------------------------

const mockFindByEmail = vi.fn();

vi.mock("../../config/di", () => ({
  container: {
    userRepository: {
      findByEmail: (...args: unknown[]) => mockFindByEmail(...args),
    },
  },
}));

vi.mock("../../services/jwt.service", () => ({
  generateToken: () => "test.jwt.token",
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

const baseInput = {
  email: "dj@example.com",
  password: "securepass1",
};

// ---------------------------------------------------------------------------
// authenticate – happy & failure paths
// ---------------------------------------------------------------------------

describe("authenticate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindByEmail.mockResolvedValue(fakeUser);
  });

  it("returns a token and user on valid credentials", async () => {
    const result = await authenticate(baseInput);
    expect(result.token).toBe("test.jwt.token");
    expect(result.user.email).toBe("dj@example.com");
    expect(result.user.role).toBe(UserRole.DJ);
    expect(result.user.onboardingCompleted).toBe(false);
  });

  it("normalises email to lowercase before lookup", async () => {
    await authenticate({ email: "DJ@Example.COM", password: "securepass1" });
    expect(mockFindByEmail).toHaveBeenCalledWith("dj@example.com");
  });

  it("throws ApiError when email is not found", async () => {
    mockFindByEmail.mockResolvedValue(null);
    await expect(authenticate(baseInput)).rejects.toThrow(ApiError);
    await expect(authenticate(baseInput)).rejects.toMatchObject({
      code: "AUTH_INVALID_CREDENTIALS",
      statusCode: 401,
    });
  });

  it("throws ApiError when password does not match", async () => {
    const wrongInput = { email: "dj@example.com", password: "wrongpassword" };
    await expect(authenticate(wrongInput)).rejects.toThrow(ApiError);
    await expect(authenticate(wrongInput)).rejects.toMatchObject({
      code: "AUTH_INVALID_CREDENTIALS",
      statusCode: 401,
    });
  });

  it("throws ApiError for empty password", async () => {
    const emptyPassword = { email: "dj@example.com", password: "" };
    await expect(authenticate(emptyPassword)).rejects.toThrow(ApiError);
    await expect(authenticate(emptyPassword)).rejects.toMatchObject({
      code: "AUTH_INVALID_CREDENTIALS",
      statusCode: 401,
    });
  });
});

// ---------------------------------------------------------------------------
// buildLoginSession
// ---------------------------------------------------------------------------

describe("buildLoginSession", () => {
  it("returns correct session shape", () => {
    const session = buildLoginSession("user-1", UserRole.DJ);
    expect(session.userId).toBe("user-1");
    expect(session.role).toBe(UserRole.DJ);
    expect(session.onboardingCompleted).toBe(false);
    expect(typeof session.issuedAt).toBe("string");
  });
});
