import bcrypt from "bcryptjs";
import type { LoginRequest, AuthResponse } from "@themixmatch/types";
import { container } from "../../config/di.js";
import { generateToken } from "../../services/jwt.service.js";
import { AuthError } from "../../utils/errors.js";

export async function authenticateUser(input: LoginRequest): Promise<AuthResponse> {
  const email = input.email.toLowerCase();
  const user = await container.userRepository.findByEmail(email);

  if (!user) {
    throw AuthError.invalidCredentials();
  }

  const isValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!isValid) {
    throw AuthError.invalidCredentials();
  }

  return {
    token: generateToken(user.id, user.role),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      onboardingCompleted: user.onboardingCompleted,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  };
}
