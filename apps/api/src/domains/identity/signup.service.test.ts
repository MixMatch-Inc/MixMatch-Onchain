import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAccount, buildSessionBootstrap } from "./signup.service";
import { UserRole } from "@mixmatch/types";
import { AuthError } from "../../utils/errors";

// ---------------------------------------------------------------------------
// Shared stubs
// ---------------------------------------------------------------------------

const mockCreate = vi.fn();
const mockExistsByEmail = vi.fn();

vi.mock("../../config/di", () => ({
  container: {
    userRepository: {
      existsByEmail: (...args: unknown[]) => mockExistsByEmail(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

vi.mock("../../services/jwt.service", () => ({
  generateToken: () => "test.jwt.token",
}));

const baseInput = {
  email: "dj@example.com",
  password: "securepass1",
  role: UserRole.DJ as const,
};

const fakeUser = {
  id: "user-1",
  name: "dj",
  email: "dj@example.com",
  role: UserRole.DJ,
  passwordHash: "hashed",
  onboardingCompleted: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ---------------------------------------------------------------------------
// createAccount – happy path
// ---------------------------------------------------------------------------

describe("createAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsByEmail.mockResolvedValue(false);
    mockCreate.mockResolvedValue(fakeUser);
  });

  it("returns a token and user on success", async () => {
    const result = await createAccount(baseInput);
    expect(result.token).toBe("test.jwt.token");
    expect(result.user.email).toBe("dj@example.com");
    expect(result.user.onboardingCompleted).toBe(false);
  });

  it("normalises email to lowercase", async () => {
    await createAccount({ ...baseInput, email: "DJ@Example.COM" });
    expect(mockExistsByEmail).toHaveBeenCalledWith("dj@example.com");
  });

  it("throws AuthError when email is already taken", async () => {
    mockExistsByEmail.mockResolvedValue(true);
    await expect(createAccount(baseInput)).rejects.toThrow(AuthError);
  });
});

// ---------------------------------------------------------------------------
// buildSessionBootstrap
// ---------------------------------------------------------------------------

describe("buildSessionBootstrap", () => {
  it("returns correct shape for a new user", () => {
    const bootstrap = buildSessionBootstrap("user-1", UserRole.DJ);
    expect(bootstrap.userId).toBe("user-1");
    expect(bootstrap.role).toBe(UserRole.DJ);
    expect(bootstrap.onboardingCompleted).toBe(false);
    expect(typeof bootstrap.issuedAt).toBe("string");
  });
});
