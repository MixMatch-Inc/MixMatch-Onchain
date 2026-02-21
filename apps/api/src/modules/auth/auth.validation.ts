import { z } from 'zod';
import { UserRole } from '@mixmatch/types';

export const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  role: z.enum([UserRole.DJ, UserRole.PLANNER, UserRole.MUSIC_LOVER]),
});

export type RegisterInput = z.infer<typeof registerSchema>;
