import { z } from 'zod';
import { emailSchema } from './auth.schema.js';

const NAME_MAX_LENGTH = 100;
const REFRESH_TOKEN_MAX_LENGTH = 1024;

export const refreshTokenSchema = z.object({
  refreshToken: z
    .string({ invalid_type_error: 'Refresh token must be a string', required_error: 'Refresh token is required' })
    .min(1, 'Refresh token is required')
    .max(REFRESH_TOKEN_MAX_LENGTH, `Refresh token must not exceed ${REFRESH_TOKEN_MAX_LENGTH} characters`),
}).strict('Refresh token payload contains unexpected fields');

export const updateProfileSchema = z.object({
  email: emailSchema.optional(),
  name: z
    .string({ invalid_type_error: 'Name must be a string' })
    .trim()
    .min(1, 'Name must not be empty')
    .max(NAME_MAX_LENGTH, `Name must not exceed ${NAME_MAX_LENGTH} characters`)
    .optional(),
}).strict('Update profile payload contains unexpected fields');

export type RefreshTokenSchema = z.infer<typeof refreshTokenSchema>;
export type UpdateProfileSchema = z.infer<typeof updateProfileSchema>;
