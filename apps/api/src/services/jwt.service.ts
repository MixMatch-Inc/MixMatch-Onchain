import dotenv from 'dotenv';
import jwt, { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { UserRole } from '@mixmatch/types';

dotenv.config();

const TOKEN_EXPIRATION = '24h';

export interface AuthTokenPayload {
  userId: string;
  role: UserRole;
}

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.trim().length === 0) {
    throw new Error('JWT_SECRET must be defined in environment variables');
  }

  return secret;
};

export const generateToken = (userId: string, role: UserRole): string => {
  const payload: AuthTokenPayload = { userId, role };

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: TOKEN_EXPIRATION,
  });
};

export const verifyToken = (token: string): AuthTokenPayload => {
  try {
    return jwt.verify(token, getJwtSecret()) as AuthTokenPayload;
  } catch (error) {
    if (error instanceof TokenExpiredError || error instanceof JsonWebTokenError) {
      throw error;
    }

    throw new JsonWebTokenError('Invalid token');
  }
};

export { TokenExpiredError, JsonWebTokenError };
