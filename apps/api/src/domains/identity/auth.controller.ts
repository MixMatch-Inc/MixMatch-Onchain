import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { UserRole } from "@mixmatch/types";
import { container } from "../../config/di";
import { generateToken } from "../../services/jwt.service";
import { loginSchema, registerSchema } from "./auth.validation";
import { AuthenticatedRequestUser } from "../../middleware/auth.middleware";
import { sendSuccess } from "../../utils/api-response";
import { AuthError, ValidationError } from "../../utils/errors";
import { auditLogService } from "../moderation/audit-log.service";
import { IUser } from "../../repositories/user.repository";

const SALT_ROUNDS = 10;
const SESSION_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours

const deriveNameFromEmail = (email: string): string => {
  const localPart = email.split("@")[0] || "mixmatch-user";
  return localPart.trim() || "mixmatch-user";
};

const serializeUser = (user: IUser) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  onboardingCompleted: user.onboardingCompleted,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const register = async (req: Request, res: Response): Promise<void> => {
  const parsedPayload = registerSchema.safeParse(req.body);

  if (!parsedPayload.success) {
    throw ValidationError.invalidInput("body", req.body, "Validation failed");
  }

  const { email, password, role } = parsedPayload.data;

  try {
    const normalizedEmail = email.toLowerCase();
    const existingUser = await container.userRepository.existsByEmail(normalizedEmail);

    if (existingUser) {
      throw AuthError.emailAlreadyExists(normalizedEmail);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const createdUser = await container.userRepository.create({
      name: deriveNameFromEmail(normalizedEmail),
      email: normalizedEmail,
      passwordHash,
      role,
      onboardingCompleted: false,
    });

    const expiresAt = new Date(Date.now() + SESSION_EXPIRATION_MS);
    const session = await container.sessionRepository.createSession(
      createdUser.id,
      expiresAt,
      req.headers['user-agent'] as string,
      req.ip as string
    );

    const token = generateToken(createdUser.id, createdUser.role as UserRole, session.sessionId);

    sendSuccess(res, 201, {
      token,
      sessionId: session.sessionId,
      user: serializeUser(createdUser),
    });
  } catch (error) {
    // Re-throw MixMatch errors to be handled by middleware
    if (error instanceof Error && "code" in error) {
      throw error;
    }

    // Handle MongoDB duplicate key error
    const maybeMongoError = error as { code?: number };
    if (maybeMongoError.code === 11000) {
      throw AuthError.emailAlreadyExists(email);
    }

    // Unknown errors will be handled by the error middleware
    throw error;
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const parsedPayload = loginSchema.safeParse(req.body);

  if (!parsedPayload.success) {
    throw ValidationError.invalidInput("body", req.body, "Validation failed");
  }

  const { email, password } = parsedPayload.data;

  try {
    const normalizedEmail = email.toLowerCase();
    const existingUser = await container.userRepository.findByEmail(normalizedEmail);

    if (!existingUser) {
      throw AuthError.invalidCredentials();
    }

    const passwordMatches = await bcrypt.compare(
      password,
      existingUser.passwordHash,
    );

    if (!passwordMatches) {
      throw AuthError.invalidCredentials();
    }

    const expiresAt = new Date(Date.now() + SESSION_EXPIRATION_MS);
    const session = await container.sessionRepository.createSession(
      existingUser.id,
      expiresAt,
      req.headers['user-agent'] as string,
      req.ip as string
    );

    const token = generateToken(existingUser.id, existingUser.role as UserRole, session.sessionId);

    sendSuccess(res, 200, {
      token,
      sessionId: session.sessionId,
      user: serializeUser(existingUser),
    });
  } catch (error) {
    // Re-throw MixMatch errors to be handled by middleware
    if (error instanceof Error && "code" in error) {
      throw error;
    }

    // Unknown errors will be handled by the error middleware
    throw error;
  }
};

export const updateOnboardingStatus = async (
  req: Request & { user?: AuthenticatedRequestUser },
  res: Response,
): Promise<void> => {
  if (!req.user?.userId) {
    res.status(401).json({ message: "Unauthorized: missing or invalid token" });
    return;
  }

  const completed = Boolean(req.body?.onboardingCompleted);

  try {
    const user = await container.userRepository.update(req.user.userId, {
      onboardingCompleted: completed,
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        onboardingCompleted: user.onboardingCompleted,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const me = async (
  req: Request & { user?: AuthenticatedRequestUser },
  res: Response,
): Promise<void> => {
  if (!req.user?.userId) {
    res.status(401).json({ message: "Unauthorized: missing or invalid token" });
    return;
  }

  try {
    const user = await container.userRepository.findById(req.user.userId);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({
      user: serializeUser(user),
    });
  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const logout = async (
  req: Request & { user?: AuthenticatedRequestUser },
  res: Response,
): Promise<void> => {
  if (!req.user?.userId || !req.user?.sessionId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const sessionIdToRevoke = req.body?.sessionId || req.user.sessionId;
    await container.sessionRepository.revokeSession(sessionIdToRevoke, req.user.userId);

    await auditLogService.log({
      action: 'USER_LOGGED_OUT',
      actorId: req.user.userId,
      targetId: req.user.userId,
      metadata: { sessionId: sessionIdToRevoke },
    });

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const logoutAll = async (
  req: Request & { user?: AuthenticatedRequestUser },
  res: Response,
): Promise<void> => {
  if (!req.user?.userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const count = await container.sessionRepository.revokeAllUserSessions(req.user.userId);

    await auditLogService.log({
      action: 'USER_LOGGED_OUT_ALL',
      actorId: req.user.userId,
      targetId: req.user.userId,
      metadata: { sessionsRevoked: count },
    });

    res.status(200).json({ message: "All sessions logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
