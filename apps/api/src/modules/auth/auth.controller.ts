import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../users/user.model';
import { generateToken } from '../../services/jwt.service';
import { loginSchema, registerSchema } from './auth.validation';
import { AuthenticatedRequestUser } from '../../middleware/auth.middleware';
import { sendError, sendSuccess, zodDetails } from '../../utils/api-response';

const SALT_ROUNDS = 10;

const deriveNameFromEmail = (email: string): string => {
  const localPart = email.split('@')[0] || 'mixmatch-user';
  return localPart.trim() || 'mixmatch-user';
};

const serializeUser = (
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    onboardingCompleted: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  },
) => ({
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
      user: serializeUser(createdUser),
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
      user: serializeUser(existingUser),
    });
  } catch {
    sendError(res, 500, 'Internal server error');
  }
};

export const updateOnboardingStatus = async (
  req: Request & { user?: AuthenticatedRequestUser },
  res: Response,
): Promise<void> => {
  if (!req.user?.userId) {
    res.status(401).json({ message: 'Unauthorized: missing or invalid token' });
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
      res.status(404).json({ message: 'User not found' });
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
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const me = async (
  req: Request & { user?: AuthenticatedRequestUser },
  res: Response,
): Promise<void> => {
  if (!req.user?.userId) {
    res.status(401).json({ message: 'Unauthorized: missing or invalid token' });
    return;
  }

  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({
      user: serializeUser(user),
    });
  } catch {
    res.status(500).json({ message: 'Internal server error' });
  }
};
