import bcrypt from "bcryptjs";
import { UserRole } from "@themixmatch/types";
import type { LoginRequest, AuthResponse } from "@themixmatch/types";
import { container } from "../../config/di.js";
import { generateToken } from "../../services/jwt.service.js";
import { AuthError } from "../../utils/errors.js";

function mapUserToPayload(user: { id: string; name: string; email: string; role: UserRole; onboardingCompleted: boolean; createdAt: Date; updatedAt: Date; }): AuthResponse["user"] {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    onboardingCompleted: user.onboardingCompleted,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function authenticateAccount(input: LoginRequest): Promise<AuthResponse> {
  const email = input.email.toLowerCase();

  const user = await container.userRepository.findByEmail(email);
  if (!user) {
    throw AuthError.invalidCredentials();
  }

  const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);
  if (!isValidPassword) {
    throw AuthError.invalidCredentials();
  }

  const token = generateToken(user.id, user.role as UserRole);

  return {
    token,
    user: mapUserToPayload(user),
  };
}
