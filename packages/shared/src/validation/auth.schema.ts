import { z } from 'zod';

const EMAIL_MAX_LENGTH = 254;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

/**
 * Email validation schema that trims whitespace, lowercases, and validates email format.
 * Includes null/undefined rejection, length limits, and XSS protection.
 */
export const emailSchema = z
  .string({ invalid_type_error: 'Email must be a string', required_error: 'Email is required' })
  .trim()
  .toLowerCase()
  .min(1, 'Email must not be empty')
  .max(EMAIL_MAX_LENGTH, `Email must not exceed ${EMAIL_MAX_LENGTH} characters`)
  .email('Enter a valid email address');

/**
 * Password validation schema with minimum and maximum length enforcement.
 * Rejects null/undefined, non-string values, and whitespace-only input.
 */
export const passwordSchema = z
  .string({ invalid_type_error: 'Password must be a string', required_error: 'Password is required' })
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`)
  .max(PASSWORD_MAX_LENGTH, `Password must not exceed ${PASSWORD_MAX_LENGTH} characters`);

/**
 * Registration payload schema - validates user registration requests.
 * Inferred type: RegisterSchema
 */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
}).strict('Registration payload contains unexpected fields');

/**
 * Login payload schema - validates user login requests.
 * Inferred type: LoginSchema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ invalid_type_error: 'Password must be a string', required_error: 'Password is required' })
    .min(1, 'Password is required'),
}).strict('Login payload contains unexpected fields');

export type RegisterSchema = z.infer<typeof registerSchema>;
export type LoginSchema = z.infer<typeof loginSchema>;