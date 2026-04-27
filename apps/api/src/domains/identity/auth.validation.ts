import { z } from 'zod';
import { UserRole } from '@mixmatch/types';

export const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  role: z.enum([UserRole.DJ, UserRole.PLANNER, UserRole.MUSIC_LOVER]),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1, 'Password is required'),
});

/** Raw token is 32 random bytes encoded as a 64-char lowercase hex string. */
export const confirmTokenSchema = z.object({
  token: z
    .string()
    .length(64, 'Verification token must be exactly 64 characters')
    .regex(/^[0-9a-f]+$/, 'Verification token must be a valid hex string'),
});

/** Password reset request schema */
export const passwordResetRequestSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
});

/** Password reset confirmation schema */
export const passwordResetConfirmSchema = z.object({
  token: z
    .string()
    .length(64, 'Reset token must be exactly 64 characters')
    .regex(/^[0-9a-f]+$/, 'Reset token must be a valid hex string'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password must be at most 128 characters'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ConfirmTokenInput = z.infer<typeof confirmTokenSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;

