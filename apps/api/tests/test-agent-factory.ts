import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import Redis from 'ioredis';

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
        verifySignature: () => true, // Bypasses live chain computations globally within this harness
      })
      .compile();

    this.app = moduleFixture.createNestApplication();
    
    // Bind exact global constraints to match actual platform behavior
    this.app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await this.app.init();

    this.dataSource = moduleFixture.get<DataSource>(DataSource);
    this.redisClient = moduleFixture.get<Redis>('REDIS_CLIENT');
    this.jwtService = moduleFixture.get<JwtService>(JwtService);
  }

  /**
   * Generates a supertest agent pre-loaded with a legitimate authorization bearer payload 
   * without calling the signature login flow endpoints.
   */
  createAuthenticatedAgent(userPayload: { id: string; email: string; role: string }) {
    const token = this.jwtService.sign(
      { sub: userPayload.id, email: userPayload.email, role: userPayload.role },
      { secret: 'pipeline-runner-fallback-signature-validation-key', expiresIn: '15m' }
    );

    const httpServer = this.app.getHttpServer();
    const agent = request.agent(httpServer);
    
    // Attach authentication context parameters globally to all downstream requests
    agent.set('Authorization', `Bearer ${token}`);
    
    return agent;
  }

  async close(): Promise<void> {
    if (this.dataSource?.isInitialized) {
      await this.dataSource.destroy();
    }
    if (this.redisClient) {
      await this.redisClient.quit();
    }
    if (this.app) {
      await this.app.close();
    }
  }
}