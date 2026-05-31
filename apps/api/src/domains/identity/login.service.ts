import bcrypt from "bcryptjs";
import { UserRole } from "@themixmatch/types";
<<<<<<< HEAD
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
=======
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
>>>>>>> origin/fix/issue-368-login-recovery-web
  };
}
