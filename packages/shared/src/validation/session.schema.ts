import { z } from 'zod';
import { emailSchema } from './auth.schema.js';

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const updateProfileSchema = z.object({
  email: emailSchema.optional(),
  name: z.string().min(1).max(100).optional(),
});

export type RefreshTokenSchema = z.infer<typeof refreshTokenSchema>;
export type UpdateProfileSchema = z.infer<typeof updateProfileSchema>;
