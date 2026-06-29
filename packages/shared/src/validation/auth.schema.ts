import { z } from 'zod';

/**
 * Email validation schema that trims whitespace and validates email format.
 * Used across all apps for consistent email validation.
 */
export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address');

/**
 * Password validation schema that enforces minimum length of 8 characters.
 * Used for registration and password updates.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must be at most 128 characters');

/**
 * Registration payload schema - validates user registration requests.
 * Inferred type: RegisterSchema
 */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

/**
 * Login payload schema - validates user login requests.
 * Inferred type: LoginSchema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(128, 'Password must be at most 128 characters'),
});

export type RegisterSchema = z.infer<typeof registerSchema>;
export type LoginSchema = z.infer<typeof loginSchema>;