import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../users/user.model';
import { generateToken } from '../../services/jwt.service';
import { loginSchema, registerSchema } from './auth.validation';
import { AuthenticatedRequestUser } from '../../middleware/auth.middleware';

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
    res.status(400).json({
      message: 'Validation failed',
      errors: parsedPayload.error.flatten(),
    });
    return;
  }

  const { email, password, role } = parsedPayload.data;

  try {
    const normalizedEmail = email.toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail }).lean();

    if (existingUser) {
      res.status(409).json({ message: 'Email is already registered' });
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

    res.status(201).json({
      token,
      user: serializeUser(createdUser),
    });
  } catch (error) {
    const maybeMongoError = error as { code?: number };

    if (maybeMongoError.code === 11000) {
      res.status(409).json({ message: 'Email is already registered' });
      return;
    }

    res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const parsedPayload = loginSchema.safeParse(req.body);

  if (!parsedPayload.success) {
    res.status(400).json({
      message: 'Validation failed',
      errors: parsedPayload.error.flatten(),
    });
    return;
  }

  const { email, password } = parsedPayload.data;

  try {
    const normalizedEmail = email.toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (!existingUser) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const passwordMatches = await bcrypt.compare(password, existingUser.passwordHash);

    if (!passwordMatches) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const token = generateToken(existingUser.id, existingUser.role);

    res.status(200).json({
      token,
      user: serializeUser(existingUser),
    });
  } catch (error) {
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
