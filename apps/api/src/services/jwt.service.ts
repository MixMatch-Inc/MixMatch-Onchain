import jwt from "jsonwebtoken";
import { UserRole } from "@themixmatch/types";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key-change-in-production";
const JWT_EXPIRES_IN = "7d";

export function generateToken(userId: string, role: UserRole): string {
  return jwt.sign(
    { userId, role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyToken(token: string): { userId: string; role: UserRole } {
  return jwt.verify(token, JWT_SECRET) as { userId: string; role: UserRole };
}
