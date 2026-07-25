import { type Express } from 'express';
import request, { type Response } from 'supertest';
import { createTestApp } from './test-app.js';

export { createTestApp } from './test-app.js';

export interface TestUser {
  email: string;
  password: string;
  id?: string;
  token?: string;
}

export interface TestContext {
  app: Express;
  users: TestUser[];
}

/**
 * Create a test context with a fresh Express app and empty user list.
 * Each test should call this to ensure isolation.
 */
export function createTestContext(): TestContext {
  return {
    app: createTestApp(),
    users: [],
  };
}

/**
 * Register a user and return the response body.
 * Automatically populates user.id and user.token on the TestUser object.
 */
export async function registerUser(
  ctx: TestContext,
  user: TestUser,
): Promise<Response> {
  const res = await request(ctx.app)
    .post('/api/auth/register')
    .send({ email: user.email, password: user.password });

  if (res.status === 201) {
    user.id = res.body.user.id;
    user.token = res.body.accessToken;
  }

  return res;
}

/**
 * Login a user and return the response body.
 * Automatically populates user.token on the TestUser object.
 */
export async function loginUser(
  ctx: TestContext,
  user: TestUser,
): Promise<Response> {
  const res = await request(ctx.app)
    .post('/api/auth/login')
    .send({ email: user.email, password: user.password });

  if (res.status === 200) {
    user.token = res.body.accessToken;
  }

  return res;
}

/**
 * Fetch the /me endpoint with a user's token.
 */
export async function getMe(user: TestUser): Promise<Response> {
  return request(user._app!)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${user.token}`);
}

/**
 * Helper to create a random test user.
 */
export function randomUser(): TestUser {
  const id = Math.random().toString(36).slice(2, 10);
  return {
    email: `test-${id}@example.com`,
    password: `password-${id}`,
  };
}

/**
 * Attach app reference to a user for getMe calls.
 */
export function attachApp(user: TestUser, app: Express): void {
  (user as TestUser & { _app: Express })._app = app;
}
