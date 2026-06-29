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
