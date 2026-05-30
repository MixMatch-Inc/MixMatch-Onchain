import type { LoginInput } from "./login.validation";
import type { AuthSession } from "@themixmatch/types";
import { ApiError } from "../../utils/errors";
import { userRepository } from "../../repositories/user.repository";
import { hashPassword } from "./signup.service";
import { jwtService } from "../../services/jwt.service";

export async function loginUser(input: LoginInput): Promise<AuthSession> {
  const { email, password } = input;

  if (!password) {
    throw new ApiError("AUTH_INVALID_CREDENTIALS", "Invalid email or password", 401);
  }

  const user = await userRepository.findByEmail(email);

  if (!user) {
    throw new ApiError("AUTH_INVALID_CREDENTIALS", "Invalid email or password", 401);
  }

  const hashedInput = hashPassword(password);
  if (user.passwordHash !== hashedInput) {
    throw new ApiError("AUTH_INVALID_CREDENTIALS", "Invalid email or password", 401);
  }

  const token = jwtService.sign({ userId: user.id, role: user.role });
  const now = new Date().toISOString();

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      onboardingCompleted: user.onboardingCompleted,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    session: {
      userId: user.id,
      role: user.role,
      onboardingCompleted: user.onboardingCompleted,
      issuedAt: now,
    },
  };
}
