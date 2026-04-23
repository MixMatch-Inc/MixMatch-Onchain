import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../users/user.model";
import { generateToken } from "../../services/jwt.service";
import { loginSchema, registerSchema } from "./auth.validation";
import { AuthenticatedRequestUser } from "../../middleware/auth.middleware";
import { sendSuccess } from "../../utils/api-response";
import { AuthError, ValidationError } from "../../utils/errors";

const SALT_ROUNDS = 10;

const deriveNameFromEmail = (email: string): string => {
  const localPart = email.split("@")[0] || "mixmatch-user";
  return localPart.trim() || "mixmatch-user";
};

const serializeUser = (user: {
  id: string;
  name: string;
  email: string;
  role: string;
  onboardingCompleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}) => ({
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
    const existingUser = await User.findOne({ email: normalizedEmail }).lean();

    if (existingUser) {
      throw AuthError.emailAlreadyExists(normalizedEmail);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const createdUser = await User.create({
      name: deriveNameFromEmail(normalizedEmail),
      email: normalizedEmail,
      passwordHash,
      role,
      onboardingCompleted: false,
    });

    const token = generateToken(createdUser.id, createdUser.role);

    sendSuccess(res, 201, {
      token,
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
    const existingUser = await User.findOne({ email: normalizedEmail });

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

    const token = generateToken(existingUser.id, existingUser.role);

    sendSuccess(res, 200, {
      token,
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
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { onboardingCompleted: completed },
      { new: true },
    );

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
    const user = await User.findById(req.user.userId);

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
