import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import Redis from 'ioredis';

const RETRY_DELAY_MS = 200;
const MAX_RETRIES = 3;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class TestHarness {
  public app: INestApplication;
  public dataSource: DataSource;
  public redisClient: Redis;
  private jwtService: JwtService;

  /**
   * Compiles the microservice stack with mocked providers matching current auth foundations
   */
  async initialize(): Promise<void> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('STELLAR_VERIFICATION_SERVICE')
      .useValue({
        verifySignature: () => true,
      })
      .compile();

    this.app = moduleFixture.createNestApplication();
    this.app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await this.app.init();

    this.dataSource = moduleFixture.get<DataSource>(DataSource);
    this.redisClient = moduleFixture.get<Redis>('REDIS_CLIENT');
    this.jwtService = moduleFixture.get<JwtService>(JwtService);
  }

  createAuthenticatedAgent(userPayload: { id: string; email: string; role: string }) {
    const token = this.jwtService.sign(
      { sub: userPayload.id, email: userPayload.email, role: userPayload.role },
      { secret: 'pipeline-runner-fallback-signature-validation-key', expiresIn: '15m' },
    );

    const httpServer = this.app.getHttpServer();
    const agent = request.agent(httpServer);
    agent.set('Authorization', `Bearer ${token}`);

    return agent;
  }

  async close(): Promise<void> {
    const closeOne = async <T>(label: string, target: { close?: () => Promise<T>; quit?: () => Promise<T>; destroy?: () => Promise<T> } | null | undefined) => {
      if (!target) return;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (typeof (target as any).destroy === 'function') {
            await (target as any).destroy();
          } else if (typeof target.close === 'function') {
            await target.close();
          } else if (typeof target.quit === 'function') {
            await target.quit();
          }
          return;
        } catch (err) {
          if (attempt === MAX_RETRIES) {
            console.warn(`[TestHarness] failed to close ${label} after ${MAX_RETRIES} attempts:`, err);
          } else {
            await delay(RETRY_DELAY_MS);
          }
        }
      }
    };

    await Promise.all([
      closeOne('DataSource', this.dataSource),
      closeOne('Redis', this.redisClient),
      closeOne('App', this.app),
    ]);
  }

  async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < MAX_RETRIES) await delay(RETRY_DELAY_MS);
      }
    }
    throw lastError!;
  }
}
