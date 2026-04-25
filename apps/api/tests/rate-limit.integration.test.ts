import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;
let createApp: typeof import('../src/app').createApp;

before(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: {
      ip: '127.0.0.1',
      port: 27082,
    },
  });
  process.env.NODE_ENV = 'test';
  process.env.MONGO_URI = mongoServer.getUri();
  process.env.JWT_SECRET = 'rate-limit-secret';
  process.env.CORS_ORIGIN = 'http://localhost:3000';
  process.env.INTERNAL_SERVICE_SECRET = 'internal-secret';

  ({ createApp } = await import('../src/app'));
  await mongoose.connect(process.env.MONGO_URI!);
});

after(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

test(
  'auth routes emit rate-limit headers and reject bursts',
  { concurrency: false },
  async () => {
  const app = createApp();

  let finalResponse:
    | {
        status: number;
        headers: Record<string, string>;
        body: Record<string, unknown>;
      }
    | undefined;

  for (let index = 0; index < 9; index += 1) {
    const response = await request(app).post('/auth/login').send({
      email: 'nobody@example.com',
      password: 'password123',
    });
    finalResponse = {
      status: response.status,
      headers: response.headers as Record<string, string>,
      body: response.body as Record<string, unknown>,
    };
  }

  assert(finalResponse);
  assert.equal(finalResponse.status, 429);
  assert.equal(finalResponse.headers['ratelimit-limit'], '8');
  assert.equal(finalResponse.body.code, 'RATE_LIMIT_EXCEEDED');
  },
);

test(
  'internal service calls bypass route-group rate limits',
  { concurrency: false },
  async () => {
  const app = createApp();

  let responseStatus = 0;

  for (let index = 0; index < 10; index += 1) {
    const response = await request(app)
      .post('/auth/login')
      .set('x-internal-service-call', 'true')
      .send({
        email: 'nobody@example.com',
        password: 'password123',
      });
    responseStatus = response.status;
  }

  assert.notEqual(responseStatus, 429);
  },
);
