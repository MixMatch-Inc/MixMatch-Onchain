import bcrypt from "bcryptjs";
import { UserRole } from "@themixmatch/types";
import type { SignupRequest, AuthResponse, SessionBootstrap } from "@themixmatch/types";
import { container } from "../../config/di.js";
import { generateToken } from "../../services/jwt.service.js";
import { AuthError } from "../../utils/errors.js";

const SALT_ROUNDS = 10;

const nameFromEmail = (email: string): string =>
  email.split("@")[0]?.trim() || "mixmatch-user";

/**
 * Creates a new user account and returns an auth token + user payload.
 * Throws AuthError.emailAlreadyExists if the address is taken.
 */
export async function createAccount(input: SignupRequest): Promise<AuthResponse> {
  const email = input.email.toLowerCase();

  const taken = await container.userRepository.existsByEmail(email);
  if (taken) throw AuthError.emailAlreadyExists(email);

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await container.userRepository.create({
    name: nameFromEmail(email),
    email,
    passwordHash,
    role: input.role,
    onboardingCompleted: false,
  });

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
 * Builds the first-session bootstrap payload from a freshly created user.
 */
export function buildSessionBootstrap(
  userId: string,
  role: UserRole,
  wallet: SessionBootstrap["wallet"],
): SessionBootstrap {
  return {
    userId,
    role,
    onboardingCompleted: false,
    issuedAt: new Date().toISOString(),
    wallet,
  };
}
