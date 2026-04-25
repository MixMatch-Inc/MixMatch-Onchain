import request from 'supertest';
import type { Express } from 'express';
import { UserRole } from '@mixmatch/types';

export interface AuthSession {
  token: string;
  userId: string;
}

export async function registerAndLogin(
  app: Express,
  email: string,
  password: string,
  role: UserRole = UserRole.DJ,
): Promise<AuthSession> {
  await request(app).post('/auth/register').send({ email, password, role });
  const res = await request(app).post('/auth/login').send({ email, password });
  return { token: res.body.token as string, userId: res.body.user.id as string };
}

export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
