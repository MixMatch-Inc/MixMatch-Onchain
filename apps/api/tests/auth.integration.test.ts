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
