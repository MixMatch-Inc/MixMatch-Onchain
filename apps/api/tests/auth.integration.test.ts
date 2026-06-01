import test, { after, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app';
import User from '../src/modules/users/user.model';

let mongoServer: MongoMemoryServer;

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongoServer.getUri();
  process.env.JWT_SECRET = 'test-secret';
  await mongoose.connect(process.env.MONGO_URI);
});

beforeEach(async () => {
  await User.deleteMany({});
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test('registers a user and returns a token', async () => {
  const app = createApp();

  const response = await request(app)
    .post('/auth/register')
    .send({
      email: 'planner@example.com',
      password: 'password123',
      role: 'PLANNER',
    });

  assert.equal(response.status, 201);
  assert.equal(typeof response.body.token, 'string');
  assert.equal(response.body.user.email, 'planner@example.com');
});

test('rejects duplicate registration for the same email', async () => {
  const app = createApp();

  await request(app).post('/auth/register').send({
    email: 'dj@example.com',
    password: 'password123',
    role: 'DJ',
  });

  const response = await request(app).post('/auth/register').send({
    email: 'dj@example.com',
    password: 'password123',
    role: 'DJ',
  });

  assert.equal(response.status, 409);
});

test('logs in an existing user with valid credentials', async () => {
  const app = createApp();

  await request(app).post('/auth/register').send({
    email: 'fan@example.com',
    password: 'password123',
    role: 'MUSIC_LOVER',
  });

  const response = await request(app).post('/auth/login').send({
    email: 'fan@example.com',
    password: 'password123',
  });

  assert.equal(response.status, 200);
  assert.equal(typeof response.body.token, 'string');
  assert.equal(response.body.user.role, 'MUSIC_LOVER');
});

test('protected route requires auth token and supports route restore after login', async () => {
  const app = createApp();

  await request(app).post('/auth/register').send({
    email: 'restore@example.com',
    password: 'password123',
    role: 'MUSIC_LOVER',
  });

  const unauth = await request(app).get('/auth/me');
  assert.equal(unauth.status, 401);

  const login = await request(app).post('/auth/login').send({
    email: 'restore@example.com',
    password: 'password123',
  });
  assert.equal(login.status, 200);
  assert.equal(typeof login.body.token, 'string');

  const authed = await request(app)
    .get('/auth/me')
    .set('Authorization', `Bearer ${login.body.token}`);
  assert.equal(authed.status, 200);
  assert.equal(authed.body.user.email, 'restore@example.com');
});

test('expired/invalid session token returns 401 contract', async () => {
  const app = createApp();
  const res = await request(app)
    .get('/auth/me')
    .set('Authorization', 'Bearer invalid-or-expired-token');
  assert.equal(res.status, 401);
});
