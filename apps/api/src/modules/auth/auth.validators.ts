import { loginSchema, registerSchema } from '@mixmatch/shared';
import { ValidationError } from '../../shared/errors/AppError.js';
import type { LoginDto, RegisterDto } from './auth.types.js';

export function parseRegisterInput(input: unknown): RegisterDto {
  const result = registerSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(result.error.issues[0]?.message ?? 'Invalid registration input');
  }
  return result.data;
}

export function parseLoginInput(input: unknown): LoginDto {
  const result = loginSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(result.error.issues[0]?.message ?? 'Invalid login input');
  }
  return result.data;
}

export function parseRefreshInput(input: unknown): { refreshToken: string } {
  if (!input || typeof input !== 'object' || !('refreshToken' in (input as Record<string, unknown>))) {
    throw new ValidationError('Refresh token is required');
  }
  const { refreshToken } = input as { refreshToken: string };
  if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
    throw new ValidationError('Refresh token is required');
  }
  return { refreshToken };
}
