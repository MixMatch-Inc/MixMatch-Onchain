import test, { after, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;
let createApp: typeof import('../src/app').createApp;
let User: typeof import('../src/domains/identity/user.model').default;

before(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: {
      ip: '127.0.0.1',
      port: 27081,
    },
  });
  process.env.NODE_ENV = 'test';
  process.env.MONGO_URI = mongoServer.getUri();
  process.env.JWT_SECRET = 'test-secret';
  process.env.CORS_ORIGIN = 'http://localhost:3000';

  ({ createApp } = await import('../src/app'));
  ({ default: User } = await import('../src/domains/identity/user.model'));

  await mongoose.connect(process.env.MONGO_URI!);
});

beforeEach(async () => {
  await User.deleteMany({});
});

after(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});
import { createApp } from '../src/app';
import User from '../src/domains/identity/user.model';
import { startMongo, stopMongo, clearCollections } from './helpers/mongo';

before(startMongo);
beforeEach(() => clearCollections(User as never));
after(stopMongo);

test('registers a user and returns a token', { concurrency: false }, async () => {
  const app = createApp();
  const response = await request(app)
    .post('/auth/register')
    .send({ email: 'planner@example.com', password: 'password123', role: 'PLANNER' });

  assert.equal(response.status, 201);
  assert.equal(typeof response.body.data.token, 'string');
  assert.equal(response.body.data.user.email, 'planner@example.com');
});

test(
  'rejects duplicate registration for the same email',
  { concurrency: false },
  async () => {
  const app = createApp();
  await request(app)
    .post('/auth/register')
    .send({ email: 'dj@example.com', password: 'password123', role: 'DJ' });

  const response = await request(app)
    .post('/auth/register')
    .send({ email: 'dj@example.com', password: 'password123', role: 'DJ' });

  assert.equal(response.status, 409);
  },
);

test(
  'logs in an existing user with valid credentials',
  { concurrency: false },
  async () => {
  const app = createApp();
  await request(app)
    .post('/auth/register')
    .send({ email: 'fan@example.com', password: 'password123', role: 'MUSIC_LOVER' });

  const response = await request(app)
    .post('/auth/login')
    .send({ email: 'fan@example.com', password: 'password123' });

  assert.equal(response.status, 200);
  assert.equal(typeof response.body.data.token, 'string');
  assert.equal(response.body.data.user.role, 'MUSIC_LOVER');
  },
);
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
