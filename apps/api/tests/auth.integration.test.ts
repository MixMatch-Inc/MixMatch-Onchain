import test, { after, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app';
import User from '../src/domains/identity/user.model';
import { startMongo, stopMongo, clearCollections } from './helpers/mongo';

before(startMongo);
beforeEach(() => clearCollections(User as never));
after(stopMongo);

test('registers a user and returns a token', async () => {
  const app = createApp();
  const response = await request(app)
    .post('/auth/register')
    .send({ email: 'planner@example.com', password: 'password123', role: 'PLANNER' });

  assert.equal(response.status, 201);
  assert.equal(typeof response.body.token, 'string');
  assert.equal(response.body.user.email, 'planner@example.com');
});

test('rejects duplicate registration for the same email', async () => {
  const app = createApp();
  await request(app)
    .post('/auth/register')
    .send({ email: 'dj@example.com', password: 'password123', role: 'DJ' });

  const response = await request(app)
    .post('/auth/register')
    .send({ email: 'dj@example.com', password: 'password123', role: 'DJ' });

  assert.equal(response.status, 409);
});

test('logs in an existing user with valid credentials', async () => {
  const app = createApp();
  await request(app)
    .post('/auth/register')
    .send({ email: 'fan@example.com', password: 'password123', role: 'MUSIC_LOVER' });

  const response = await request(app)
    .post('/auth/login')
    .send({ email: 'fan@example.com', password: 'password123' });

  assert.equal(response.status, 200);
  assert.equal(typeof response.body.token, 'string');
  assert.equal(response.body.user.role, 'MUSIC_LOVER');
});

test('GET /auth/me returns current user when authenticated', async () => {
  const app = createApp();
  const reg = await request(app)
    .post('/auth/register')
    .send({ email: 'me@example.com', password: 'password123', role: 'DJ' });

  const token = reg.body.token as string;
  const response = await request(app)
    .get('/auth/me')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.user.email, 'me@example.com');
});

test('GET /auth/me returns 401 without token', async () => {
  const app = createApp();
  const response = await request(app).get('/auth/me');
  assert.equal(response.status, 401);
});
