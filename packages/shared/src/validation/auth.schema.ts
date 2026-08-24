import { z } from 'zod';

const EMAIL_MAX_LENGTH = 254;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

export const emailSchema = z
  .string({ invalid_type_error: 'Email must be a string', required_error: 'Email is required' })
  .trim()
  .toLowerCase()
  .min(1, 'Email must not be empty')
  .max(EMAIL_MAX_LENGTH, `Email must not exceed ${EMAIL_MAX_LENGTH} characters`)
  .email('Enter a valid email address');

export const passwordSchema = z
  .string({ invalid_type_error: 'Password must be a string', required_error: 'Password is required' })
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`)
  .max(PASSWORD_MAX_LENGTH, `Password must not exceed ${PASSWORD_MAX_LENGTH} characters`);

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
  })
  .strict('Registration payload contains unexpected fields');

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z
      .string({ invalid_type_error: 'Password must be a string', required_error: 'Password is required' })
      .min(1, 'Password is required')
      .max(PASSWORD_MAX_LENGTH, `Password must not exceed ${PASSWORD_MAX_LENGTH} characters`),
  })
  .strict('Login payload contains unexpected fields');

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
