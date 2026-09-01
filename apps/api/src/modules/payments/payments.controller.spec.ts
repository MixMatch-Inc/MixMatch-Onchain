import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Observable } from 'rxjs';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import type { TransactionRecord } from './transaction.repository';
import type { StellarAccountRecord } from './stellar-account.repository';

// Stub out guards so tests skip auth entirely
jest.mock('../auth/jwt-auth.guard', () => ({
  JwtAuthGuard: jest.fn().mockImplementation(() => ({
    canActivate: () => true,
  })),
}));

jest.mock('../auth/current-user.decorator', () => ({
  CurrentUserId: () => (_target: unknown, _propertyKey: string, _parameterIndex: number) => {},
}));

const TRANSACTION: TransactionRecord = {
  id: 'tx-1',
  idempotencyKey: 'key-1',
  stellarAccountId: 'account-1',
  destinationPublicKey: 'GDEST',
  amount: '10.0000000',
  memo: null,
  assetCode: null,
  assetIssuer: null,
  receiveAssetCode: null,
  receiveAssetIssuer: null,
  destAmount: null,
  pendingEnvelopeXdr: null,
  status: 'SUCCESS',
  stellarTxHash: 'tx-hash',
  failureCode: null,
  failureReason: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const ACCOUNT: StellarAccountRecord = {
  id: 'account-1',
  userId: 'user-1',
  publicKey: 'GABCDEF',
  encryptedSecretKey: 'encrypted',
  signingKeyId: null,
  network: 'testnet',
  multisigConfigured: false,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('PaymentsController', () => {
  let module: TestingModule;
  let controller: PaymentsController;
  let paymentsService: jest.Mocked<PaymentsService>;

  beforeAll(async () => {
    const mockPaymentsService = {
      sendPayment: jest.fn(),
      previewPath: jest.fn(),
      establishTrustlineForUser: jest.fn(),
      getOrCreateStellarAccount: jest.fn(),
      streamTransactionUpdates: jest.fn(),
      listTransactionHistory: jest.fn(),
      getTransactionStatus: jest.fn(),
      reconcileTransactionById: jest.fn(),
    };

    module = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        { provide: PaymentsService, useValue: mockPaymentsService },
      ],
    }).compile();

    controller = module.get(PaymentsController);
    paymentsService = module.get(PaymentsService) as jest.Mocked<PaymentsService>;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await module.close();
  });

  describe('send', () => {
    it('calls sendPayment with userId and body, returns wrapped transaction', async () => {
      paymentsService.sendPayment.mockResolvedValue(TRANSACTION);

      const result = await controller.send('user-1', {
        destinationPublicKey: 'GDEST',
        amount: '10',
      });

      expect(result).toEqual({ transaction: TRANSACTION });
      expect(paymentsService.sendPayment).toHaveBeenCalledWith('user-1', {
        destinationPublicKey: 'GDEST',
        amount: '10',
      });
    });

    it('propagates PaymentFailedError from the service', async () => {
      const error = new Error('insufficient_balance');
      paymentsService.sendPayment.mockRejectedValue(error);

      await expect(
        controller.send('user-1', {
          destinationPublicKey: 'GDEST',
          amount: '10',
        }),
      ).rejects.toThrow('insufficient_balance');
    });
  });

  describe('quote', () => {
    it('returns a path quote from previewPath', async () => {
      const quote = {
        mode: 'strictSend' as const,
        sourceAmount: '10',
        destAmount: '19.8',
        path: [],
      };
      paymentsService.previewPath.mockResolvedValue(quote);

      const result = await controller.quote({
        source: {},
        dest: { assetCode: 'MMX', assetIssuer: 'GISSUER' },
        amount: '10',
        mode: 'strictSend',
      });

      expect(result).toEqual(quote);
      expect(paymentsService.previewPath).toHaveBeenCalled();
    });

    it('propagates PaymentFailedError when no path exists', async () => {
      const error = Object.assign(new Error('No payment path'), {
        kind: 'no_payment_path',
      });
      paymentsService.previewPath.mockRejectedValue(error);

      await expect(
        controller.quote({
          source: {},
          dest: { assetCode: 'MMX', assetIssuer: 'GISSUER' },
          amount: '10',
          mode: 'strictSend',
        }),
      ).rejects.toMatchObject({ kind: 'no_payment_path' });
    });
  });

  describe('establishTrustline', () => {
    it('returns trustline result from the service', async () => {
      const response = {
        stellarTxHash: 'trust-hash',
        assetCode: 'USDC',
        assetIssuer: 'GISSUER',
      };
      paymentsService.establishTrustlineForUser.mockResolvedValue(response);

      const result = await controller.establishTrustline('user-1', {
        assetCode: 'USDC',
        assetIssuer: 'GISSUER',
      });

      expect(result).toEqual(response);
      expect(paymentsService.establishTrustlineForUser).toHaveBeenCalledWith(
        'user-1',
        { assetCode: 'USDC', assetIssuer: 'GISSUER' },
      );
    });
  });

  describe('account', () => {
    it('returns the Stellar account public key and network', async () => {
      paymentsService.getOrCreateStellarAccount.mockResolvedValue(ACCOUNT);

      const result = await controller.account('user-1');

      expect(result).toEqual({
        publicKey: 'GABCDEF',
        network: 'testnet',
      });
      expect(paymentsService.getOrCreateStellarAccount).toHaveBeenCalledWith(
        'user-1',
      );
    });
  });

  describe('stream', () => {
    it('returns an observable that wraps transaction updates as MessageEvents', async () => {
      const mockObservable = new Observable<TransactionRecord>(() => {});
      paymentsService.streamTransactionUpdates.mockReturnValue(
        mockObservable,
      );

      const result = controller.stream('user-1');

      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(Observable);
      expect(paymentsService.streamTransactionUpdates).toHaveBeenCalledWith(
        'user-1',
      );
    });
  });

  describe('history', () => {
    it('returns paginated transaction history from the service', async () => {
      paymentsService.listTransactionHistory.mockResolvedValue({
        transactions: [TRANSACTION],
        total: 1,
      });

      const result = await controller.history('user-1', {
        page: '1',
        limit: '20',
      });

      expect(result).toEqual({
        transactions: [TRANSACTION],
        total: 1,
        page: 1,
        limit: 20,
      });
      expect(paymentsService.listTransactionHistory).toHaveBeenCalledWith(
        'user-1',
        1,
        20,
      );
    });

    it('handles empty history gracefully', async () => {
      paymentsService.listTransactionHistory.mockResolvedValue({
        transactions: [],
        total: 0,
      });

      const result = await controller.history('user-1', {});

      expect(result).toEqual({
        transactions: [],
        total: 0,
        page: 1,
        limit: 20,
      });
    });
  });

  describe('status', () => {
    it('returns the transaction status from the service', async () => {
      paymentsService.getTransactionStatus.mockResolvedValue(TRANSACTION);

      const result = await controller.status('user-1', 'tx-1');

      expect(result).toEqual({ transaction: TRANSACTION });
      expect(paymentsService.getTransactionStatus).toHaveBeenCalledWith(
        'user-1',
        'tx-1',
      );
    });

    it('throws NotFoundException for a non-existent transaction', async () => {
      paymentsService.getTransactionStatus.mockRejectedValue(
        new NotFoundException('Transaction not found'),
      );

      await expect(controller.status('user-1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reconcile', () => {
    it('triggers manual reconciliation and returns the updated transaction', async () => {
      paymentsService.reconcileTransactionById.mockResolvedValue(TRANSACTION);

      const result = await controller.reconcile('user-1', 'tx-1');

      expect(result).toEqual({ transaction: TRANSACTION });
      expect(paymentsService.reconcileTransactionById).toHaveBeenCalledWith(
        'user-1',
        'tx-1',
      );
    });

    it('throws NotFoundException for a non-existent transaction', async () => {
      paymentsService.reconcileTransactionById.mockRejectedValue(
        new NotFoundException('Transaction not found'),
      );

      await expect(controller.reconcile('user-1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
