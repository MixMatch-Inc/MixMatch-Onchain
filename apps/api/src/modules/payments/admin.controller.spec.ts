import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { PaymentsService } from './payments.service';
import { PaymentFailedError } from './payment-errors';
import type { TransactionRecord } from './transaction.repository';

// Stub out guards so tests skip auth entirely
jest.mock('../auth/jwt-auth.guard', () => ({
  JwtAuthGuard: jest.fn().mockImplementation(() => ({
    canActivate: () => true,
  })),
}));

jest.mock('../auth/roles.guard', () => ({
  RolesGuard: jest.fn().mockImplementation(() => ({
    canActivate: () => true,
  })),
}));

jest.mock('../../common/admin-rate-limit.guard', () => ({
  AdminRateLimitGuard: jest.fn().mockImplementation(() => ({
    canActivate: () => true,
  })),
}));

function buildPendingTx(overrides: Partial<TransactionRecord> = {}): TransactionRecord {
  return {
    id: 'tx-pending',
    idempotencyKey: 'key-1',
    stellarAccountId: 'account-1',
    destinationPublicKey: 'GDEST',
    amount: '5000',
    memo: null,
    assetCode: null,
    assetIssuer: null,
    receiveAssetCode: null,
    receiveAssetIssuer: null,
    destAmount: null,
    pendingEnvelopeXdr: 'envelope-xdr',
    status: 'PENDING_SIGNATURE',
    stellarTxHash: null,
    failureCode: null,
    failureReason: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('AdminController', () => {
  let module: TestingModule;
  let controller: AdminController;
  let paymentsService: jest.Mocked<PaymentsService>;

  beforeAll(async () => {
    const mockPaymentsService = {
      listPendingSignatures: jest.fn(),
      approvePendingSignature: jest.fn(),
      rejectPendingSignature: jest.fn(),
    };

    module = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: PaymentsService, useValue: mockPaymentsService },
      ],
    }).compile();

    controller = module.get(AdminController);
    paymentsService = module.get(PaymentsService) as jest.Mocked<PaymentsService>;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await module.close();
  });

  describe('listPendingSignatures', () => {
    it('returns all pending-signature transactions', async () => {
      paymentsService.listPendingSignatures.mockResolvedValue([buildPendingTx({ id: 'tx-list-1' })]);

      const result = await controller.listPendingSignatures();

      expect(result).toEqual({ transactions: [expect.objectContaining({ id: 'tx-list-1' })] });
      expect(paymentsService.listPendingSignatures).toHaveBeenCalledTimes(1);
    });

    it('returns empty list when no transactions are pending', async () => {
      paymentsService.listPendingSignatures.mockResolvedValue([]);

      const result = await controller.listPendingSignatures();

      expect(result).toEqual({ transactions: [] });
    });
  });

  describe('approve', () => {
    it('approves a pending-signature transaction and returns the approved transaction', async () => {
      const approved = buildPendingTx({
        id: 'tx-approve-1',
        status: 'SUCCESS',
        stellarTxHash: 'approved-hash',
        pendingEnvelopeXdr: null,
      });
      paymentsService.approvePendingSignature.mockResolvedValue(approved);

      const result = await controller.approve('tx-approve-1');

      expect(result).toEqual({ transaction: approved });
      expect(paymentsService.approvePendingSignature).toHaveBeenCalledWith(
        'tx-approve-1',
      );
    });

    it('throws when the transaction is not awaiting a signature', async () => {
      paymentsService.approvePendingSignature.mockRejectedValue(
        new PaymentFailedError(
          'malformed_transaction',
          'Transaction tx-approve-2 is not awaiting a signature',
        ),
      );

      await expect(controller.approve('tx-approve-2')).rejects.toThrow(
        PaymentFailedError,
      );
    });

    it('throws NotFoundException for a non-existent transaction', async () => {
      paymentsService.approvePendingSignature.mockRejectedValue(
        new NotFoundException('Transaction not found'),
      );

      await expect(controller.approve('tx-approve-missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reject', () => {
    it('rejects a pending-signature transaction and returns the rejected transaction', async () => {
      const rejected = buildPendingTx({
        id: 'tx-reject-1',
        status: 'FAILED',
        failureCode: 'admin_rejected',
        failureReason: 'An administrator declined to co-sign this payment',
        pendingEnvelopeXdr: null,
      });
      paymentsService.rejectPendingSignature.mockResolvedValue(rejected);

      const result = await controller.reject('tx-reject-1', {});

      expect(result).toEqual({ transaction: rejected });
      expect(paymentsService.rejectPendingSignature).toHaveBeenCalledWith(
        'tx-reject-1',
        undefined,
      );
    });

    it('passes the rejection reason to the service', async () => {
      const rejected = buildPendingTx({
        id: 'tx-reject-2',
        status: 'FAILED',
        failureCode: 'admin_rejected',
        pendingEnvelopeXdr: null,
      });
      paymentsService.rejectPendingSignature.mockResolvedValue(rejected);

      await controller.reject('tx-reject-2', { reason: 'Suspicious amount' });

      expect(paymentsService.rejectPendingSignature).toHaveBeenCalledWith(
        'tx-reject-2',
        'Suspicious amount',
      );
    });

    it('throws when the transaction is not awaiting a signature', async () => {
      paymentsService.rejectPendingSignature.mockRejectedValue(
        new PaymentFailedError(
          'malformed_transaction',
          'Transaction tx-reject-3 is not awaiting a signature',
        ),
      );

      await expect(controller.reject('tx-reject-3', {})).rejects.toThrow(
        PaymentFailedError,
      );
    });

    it('throws NotFoundException for a non-existent transaction', async () => {
      paymentsService.rejectPendingSignature.mockRejectedValue(
        new NotFoundException('Transaction not found'),
      );

      await expect(controller.reject('tx-reject-missing', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('idempotency', () => {
    it('rejects a duplicate approve request with 409 Conflict', async () => {
      const approved = buildPendingTx({
        id: 'tx-idem-1',
        status: 'SUCCESS',
        stellarTxHash: 'approved-hash',
        pendingEnvelopeXdr: null,
      });
      paymentsService.approvePendingSignature.mockResolvedValue(approved);

      // First call succeeds
      await controller.approve('tx-idem-1');

      // Second call with same tx id gets caught by idempotency check
      await expect(controller.approve('tx-idem-1')).rejects.toThrow(
        ConflictException,
      );

      // Service called only once — duplicate was rejected before reaching it
      expect(paymentsService.approvePendingSignature).toHaveBeenCalledTimes(1);
    });

    it('rejects a duplicate reject request with 409 Conflict', async () => {
      const rejected = buildPendingTx({
        id: 'tx-idem-2',
        status: 'FAILED',
        failureCode: 'admin_rejected',
        pendingEnvelopeXdr: null,
      });
      paymentsService.rejectPendingSignature.mockResolvedValue(rejected);

      await controller.reject('tx-idem-2', {});

      await expect(controller.reject('tx-idem-2', {})).rejects.toThrow(
        ConflictException,
      );
      expect(paymentsService.rejectPendingSignature).toHaveBeenCalledTimes(1);
    });

    it('allows different actions on the same transaction (approve then reject)', async () => {
      const approved = buildPendingTx({
        id: 'tx-idem-3',
        status: 'SUCCESS',
        stellarTxHash: 'approved-hash',
        pendingEnvelopeXdr: null,
      });
      const rejected = buildPendingTx({
        id: 'tx-idem-3',
        status: 'FAILED',
        failureCode: 'admin_rejected',
        pendingEnvelopeXdr: null,
      });
      paymentsService.approvePendingSignature.mockResolvedValue(approved);
      paymentsService.rejectPendingSignature.mockResolvedValue(rejected);

      // Approve with implicit key "approve:tx-idem-3"
      await controller.approve('tx-idem-3');
      // Reject with implicit key "reject:tx-idem-3" — different key, so it passes
      await controller.reject('tx-idem-3', {});

      expect(paymentsService.approvePendingSignature).toHaveBeenCalledTimes(1);
      expect(paymentsService.rejectPendingSignature).toHaveBeenCalledTimes(1);
    });

    it('uses explicit idempotency-key header when provided', async () => {
      const approved = buildPendingTx({
        id: 'tx-idem-4',
        status: 'SUCCESS',
        stellarTxHash: 'approved-hash',
        pendingEnvelopeXdr: null,
      });
      paymentsService.approvePendingSignature.mockResolvedValue(approved);

      await controller.approve('tx-idem-4', 'custom-key');

      await expect(controller.approve('tx-idem-4', 'custom-key')).rejects.toThrow(
        ConflictException,
      );
      expect(paymentsService.approvePendingSignature).toHaveBeenCalledTimes(1);
    });

    it('allows different explicit idempotency keys for the same transaction', async () => {
      const approved = buildPendingTx({
        id: 'tx-idem-5',
        status: 'SUCCESS',
        stellarTxHash: 'approved-hash',
        pendingEnvelopeXdr: null,
      });
      paymentsService.approvePendingSignature.mockResolvedValue(approved);

      await controller.approve('tx-idem-5', 'key-A');
      await controller.approve('tx-idem-5', 'key-B');

      expect(paymentsService.approvePendingSignature).toHaveBeenCalledTimes(2);
    });
  });

  describe('role enforcement', () => {
    it('exposes the three admin endpoints', () => {
      // The AdminController is decorated with @Roles('ADMIN') at the class level.
      // In production, the RolesGuard enforces this by checking request.userRole.
      // In these tests, the guard is stubbed to always allow.
      // The integration test or E2E test should verify actual role enforcement.
      expect(controller).toBeDefined();
      expect(typeof controller.approve).toBe('function');
      expect(typeof controller.reject).toBe('function');
      expect(typeof controller.listPendingSignatures).toBe('function');
    });
  });
});
