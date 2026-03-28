import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../users/user.model';
import { generateToken } from '../../services/jwt.service';
import { loginSchema, registerSchema } from './auth.validation';
import { sendError, sendSuccess, zodDetails } from '../../utils/api-response';

const SALT_ROUNDS = 10;

const deriveNameFromEmail = (email: string): string => {
  const localPart = email.split('@')[0] || 'mixmatch-user';
  return localPart.trim() || 'mixmatch-user';
};

export const register = async (req: Request, res: Response): Promise<void> => {
  const parsedPayload = registerSchema.safeParse(req.body);

  if (!parsedPayload.success) {
    sendError(res, 400, 'Validation failed', zodDetails(parsedPayload.error));
    return;
  }

  const { email, password, role } = parsedPayload.data;

  try {
    const normalizedEmail = email.toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail }).lean();

    if (existingUser) {
      sendError(res, 409, 'Email is already registered');
      return;
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
      user: {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role,
        onboardingCompleted: createdUser.onboardingCompleted,
        createdAt: createdUser.createdAt,
        updatedAt: createdUser.updatedAt,
      },
    });
  } catch (error) {
    const maybeMongoError = error as { code?: number };

    if (maybeMongoError.code === 11000) {
      sendError(res, 409, 'Email is already registered');
      return;
    }

    sendError(res, 500, 'Internal server error');
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const parsedPayload = loginSchema.safeParse(req.body);

  if (!parsedPayload.success) {
    sendError(res, 400, 'Validation failed', zodDetails(parsedPayload.error));
    return;
  }

  const { email, password } = parsedPayload.data;

  try {
    const normalizedEmail = email.toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (!existingUser) {
      sendError(res, 401, 'Invalid email or password');
      return;
    }

    const passwordMatches = await bcrypt.compare(password, existingUser.passwordHash);

    if (!passwordMatches) {
      sendError(res, 401, 'Invalid email or password');
      return;
    }

    const token = generateToken(existingUser.id, existingUser.role);

    sendSuccess(res, 200, {
      token,
      user: {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role,
        onboardingCompleted: existingUser.onboardingCompleted,
        createdAt: existingUser.createdAt,
        updatedAt: existingUser.updatedAt,
      },
    });
  } catch {
    sendError(res, 500, 'Internal server error');
  }
};
