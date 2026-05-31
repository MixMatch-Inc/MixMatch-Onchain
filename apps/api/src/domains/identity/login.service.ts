import bcrypt from "bcryptjs";
import { UserRole } from "@themixmatch/types";
import type { LoginRequest, AuthResponse } from "@themixmatch/types";
import { container } from "../../config/di.js";
import { generateAccessToken, generateRefreshToken } from "../../services/jwt.service.js";
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

  const token = generateAccessToken(user.id, user.role as UserRole);

  // Issue a refresh token and persist it
  const { token: refreshToken, jti } = generateRefreshToken(user.id, user.role as UserRole);
  const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
  await container.refreshTokenRepository.save({
    jti,
    userId: user.id,
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS).toISOString(),
    revoked: false,
  });

  return {
    token,
    refreshToken,
    user: mapUserToPayload(user),
  };
}
