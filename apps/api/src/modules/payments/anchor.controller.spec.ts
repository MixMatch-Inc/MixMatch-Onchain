import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AnchorController } from './anchor.controller';
import { AnchorService } from './anchor.service';

/**
 * #893: Controller-level coverage for `AnchorController` — verifies the
 * JWT auth guard is actually enforced on every route, the Zod pipes reject
 * malformed bodies, and success/error responses are shaped correctly.
 * The real `JwtAuthGuard` runs against a mocked `JwtService` so the
 * guard wiring (not a stand-in) is what's under test.
 */
describe('AnchorController', () => {
  let anchorService: Record<string, jest.Mock>;
  let jwtVerify: jest.Mock;

  beforeEach(() => {
    anchorService = {
      depositForUser: jest.fn(),
      withdrawForUser: jest.fn(),
      getStatusForUser: jest.fn(),
      listHistoryForUser: jest.fn(),
    };
    jwtVerify = jest.fn().mockReturnValue({ sub: 'user-1' });
  });

  async function buildApp(): Promise<
    import('@nestjs/common').INestApplication<App>
  > {
    const module = await Test.createTestingModule({
      controllers: [AnchorController],
      providers: [
        { provide: AnchorService, useValue: anchorService },
        { provide: JwtService, useValue: { verify: jwtVerify } },
      ],
    }).compile();

    const app = module.createNestApplication();
    await app.init();
    return app;
  }

  describe('auth guard enforcement', () => {
    it('rejects every route without an Authorization header', async () => {
      const app = await buildApp();
      const server = app.getHttpServer();

      await request(server).post('/anchor/deposit').expect(401);
      await request(server).post('/anchor/withdraw').expect(401);
      await request(server).get('/anchor/some-id/status').expect(401);
      await request(server).get('/anchor/history').expect(401);

      await app.close();
    });

    it('rejects an invalid token with 401', async () => {
      jwtVerify.mockImplementation(() => {
        throw new Error('expired');
      });
      const app = await buildApp();
      const server = app.getHttpServer();

      await request(server)
        .get('/anchor/history')
        .set('Authorization', 'Bearer expired-token')
        .expect(401);

      await app.close();
    });
  });

  describe('param validation', () => {
    it('rejects a deposit body with an invalid asset code', async () => {
      const app = await buildApp();
      const server = app.getHttpServer();

      await request(server)
        .post('/anchor/deposit')
        .set('Authorization', 'Bearer token')
        .send({ assetCode: 'not valid!' })
        .expect(400);

      await app.close();
    });

    it('rejects a deposit body missing required fields', async () => {
      const app = await buildApp();
      const server = app.getHttpServer();

      await request(server)
        .post('/anchor/deposit')
        .set('Authorization', 'Bearer token')
        .send({})
        .expect(400);

      await app.close();
    });

    it('rejects a withdrawal body with a non-positive amount', async () => {
      const app = await buildApp();
      const server = app.getHttpServer();

      await request(server)
        .post('/anchor/withdraw')
        .set('Authorization', 'Bearer token')
        .send({ assetCode: 'SRT', amount: '0' })
        .expect(400);

      await app.close();
    });

    it('accepts a valid deposit body', async () => {
      anchorService.depositForUser.mockResolvedValue({
        transaction: { id: 'anchor-tx-1' },
        interactiveUrl: 'https://anchor/kyc',
      });
      const app = await buildApp();
      const server = app.getHttpServer();

      await request(server)
        .post('/anchor/deposit')
        .set('Authorization', 'Bearer token')
        .send({ assetCode: 'SRT', amount: '10' })
        .expect(201);

      await app.close();
    });
  });

  describe('success responses', () => {
    it('returns the deposit result with the authenticated userId', async () => {
      anchorService.depositForUser.mockResolvedValue({
        transaction: { id: 'anchor-tx-1' },
        interactiveUrl: 'https://anchor/kyc',
      });
      const app = await buildApp();
      const server = app.getHttpServer();

      const response = await request(server)
        .post('/anchor/deposit')
        .set('Authorization', 'Bearer token')
        .send({ assetCode: 'SRT', amount: '10' });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        transaction: { id: 'anchor-tx-1' },
        interactiveUrl: 'https://anchor/kyc',
      });
      expect(anchorService.depositForUser).toHaveBeenCalledWith('user-1', {
        assetCode: 'SRT',
        amount: '10',
      });

      await app.close();
    });

    it('returns the withdrawal result', async () => {
      anchorService.withdrawForUser.mockResolvedValue({
        transaction: { id: 'anchor-tx-2' },
        interactiveUrl: 'https://anchor/withdraw',
      });
      const app = await buildApp();
      const server = app.getHttpServer();

      const response = await request(server)
        .post('/anchor/withdraw')
        .set('Authorization', 'Bearer token')
        .send({ assetCode: 'SRT' });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        transaction: { id: 'anchor-tx-2' },
        interactiveUrl: 'https://anchor/withdraw',
      });

      await app.close();
    });

    it('returns the transaction status wrapped in { transaction }', async () => {
      anchorService.getStatusForUser.mockResolvedValue({
        id: 'anchor-tx-1',
        status: 'completed',
      });
      const app = await buildApp();
      const server = app.getHttpServer();

      const response = await request(server)
        .get('/anchor/anchor-tx-1/status')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        transaction: { id: 'anchor-tx-1', status: 'completed' },
      });
      expect(anchorService.getStatusForUser).toHaveBeenCalledWith(
        'user-1',
        'anchor-tx-1',
      );

      await app.close();
    });

    it('returns a paginated history page', async () => {
      anchorService.listHistoryForUser.mockResolvedValue({
        transactions: [{ id: 'anchor-tx-1' }],
        total: 1,
      });
      const app = await buildApp();
      const server = app.getHttpServer();

      const response = await request(server)
        .get('/anchor/history?page=1&limit=20')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        transactions: [{ id: 'anchor-tx-1' }],
        total: 1,
        page: 1,
        limit: 20,
      });

      await app.close();
    });
  });

  describe('error responses', () => {
    it('maps a NotFoundException from the service to 404', async () => {
      anchorService.getStatusForUser.mockRejectedValue(
        new NotFoundException('Anchor transaction not found'),
      );
      const app = await buildApp();
      const server = app.getHttpServer();

      await request(server)
        .get('/anchor/missing/status')
        .set('Authorization', 'Bearer token')
        .expect(404);

      await app.close();
    });

    it('maps a ForbiddenException from the service to 403', async () => {
      anchorService.getStatusForUser.mockRejectedValue(
        new ForbiddenException(
          'You do not have access to this anchor transaction',
        ),
      );
      const app = await buildApp();
      const server = app.getHttpServer();

      await request(server)
        .get('/anchor/anchor-tx-1/status')
        .set('Authorization', 'Bearer token')
        .expect(403);

      await app.close();
    });
  });
});
