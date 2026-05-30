import { z } from "zod";
import { UserRole } from "@themixmatch/types";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum([UserRole.DJ, UserRole.PLANNER, UserRole.MUSIC_LOVER]),
});
