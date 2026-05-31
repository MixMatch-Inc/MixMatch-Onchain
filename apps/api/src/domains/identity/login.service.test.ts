import { describe, it, expect, vi, beforeEach } from "vitest";
import { authenticateAccount } from "./login.service.js";
import { UserRole } from "@themixmatch/types";
import { AuthError } from "../../utils/errors.js";

const mockFindByEmail = vi.fn();
const mockCompare = vi.fn();

vi.mock("../../config/di", () => ({
  container: {
    userRepository: {
      findByEmail: (...args: unknown[]) => mockFindByEmail(...args),
    },
  },
}));

vi.mock("bcryptjs", () => ({
  compare: (...args: unknown[]) => mockCompare(...args),
}));

vi.mock("../../services/jwt.service", () => ({
  generateToken: () => "test.jwt.token",
}));

const validInput = {
  email: "dj@example.com",
  password: "securepass1",
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

describe("authenticateAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindByEmail.mockResolvedValue(fakeUser);
    mockCompare.mockResolvedValue(true);
  });

  it("returns a token and user payload when credentials are valid", async () => {
    const result = await authenticateAccount(validInput);

    expect(result.token).toBe("test.jwt.token");
    expect(result.user.email).toBe("dj@example.com");
    expect(result.user.onboardingCompleted).toBe(false);
  });

  it("throws invalid credentials when the user does not exist", async () => {
    mockFindByEmail.mockResolvedValue(null);

    await expect(authenticateAccount(validInput)).rejects.toMatchObject({
      code: AuthError.invalidCredentials().code,
      message: AuthError.invalidCredentials().message,
    });
  });

  it("throws invalid credentials when the password is incorrect", async () => {
    mockCompare.mockResolvedValue(false);

    await expect(authenticateAccount(validInput)).rejects.toMatchObject({
      code: AuthError.invalidCredentials().code,
      message: AuthError.invalidCredentials().message,
    });
  });
});
