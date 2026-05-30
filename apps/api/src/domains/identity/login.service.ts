import bcrypt from "bcryptjs";
import { UserRole } from "@themixmatch/types";
import type { LoginRequest, AuthResponse, SessionBootstrap } from "@themixmatch/types";
import { container } from "../../config/di.js";
import { generateToken } from "../../services/jwt.service.js";
import { AuthError } from "../../utils/errors.js";

/**
 * Authenticates a user with email and password.
 * Returns an auth token + user payload on success.
 * Throws AuthError.invalidCredentials if the credentials don't match.
 */
export async function authenticate(input: LoginRequest): Promise<AuthResponse> {
  const email = input.email.toLowerCase();

  const user = await container.userRepository.findByEmail(email);
  if (!user) throw AuthError.invalidCredentials();

  const passwordMatch = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatch) throw AuthError.invalidCredentials();

  const token = generateToken(user.id, user.role as UserRole);

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
      onboardingCompleted: user.onboardingCompleted,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  };
}

/**
 * Builds the session bootstrap payload from an authenticated user.
 */
export function buildLoginSession(
  userId: string,
  role: UserRole,
): SessionBootstrap {
  return {
    userId,
    role,
    onboardingCompleted: false,
    issuedAt: new Date().toISOString(),
  };
}
