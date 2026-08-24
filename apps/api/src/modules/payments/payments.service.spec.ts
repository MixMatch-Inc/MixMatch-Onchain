import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { Keypair } from '@stellar/stellar-sdk';
import {
  StellarPaymentError,
  type DefaultStellarClient,
  type StellarPaymentService as StellarPaymentEngine,
} from '@mixmatch/stellar';
import { encryptSecretKey } from './wallet-encryption';
import { PaymentFailedError } from './payment-errors';
import { PaymentsService } from './payments.service';
import {
  DuplicateIdempotencyKeyError,
  TransactionRepository,
  type TransactionRecord,
} from './transaction.repository';
import {
  StellarAccountRepository,
  type StellarAccountRecord,
} from './stellar-account.repository';

const ENCRYPTION_KEY = 'ab'.repeat(32);
const REAL_TESTNET_SECRET = Keypair.random().secret();

function buildAccount(
  overrides: Partial<StellarAccountRecord> = {},
): StellarAccountRecord {
  return {
    id: 'account-1',
    userId: 'user-1',
    publicKey: 'GABCDEF',
    encryptedSecretKey: encryptSecretKey(REAL_TESTNET_SECRET, ENCRYPTION_KEY),
    network: 'testnet',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildTransaction(
  overrides: Partial<TransactionRecord> = {},
): TransactionRecord {
  return {
    id: 'tx-1',
    idempotencyKey: 'key-1',
    stellarAccountId: 'account-1',
    destinationPublicKey: 'GDEST',
    amount: '10.0000000',
    memo: null,
    status: 'PENDING',
    stellarTxHash: null,
    failureCode: null,
    failureReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('PaymentsService', () => {
  let service: PaymentsService;
  let stellarAccountRepository: Record<string, jest.Mock>;
  let transactionRepository: Record<string, jest.Mock>;
  let paymentEngine: { submitNativePayment: jest.Mock };
  let stellarClient: {
    getNetwork: jest.Mock;
    horizon: Record<string, jest.Mock>;
  };

  beforeEach(() => {
    stellarAccountRepository = {
      findByUserId: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };
    transactionRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByIdempotencyKey: jest.fn(),
      updateStatus: jest.fn(),
      listByStellarAccountId: jest.fn(),
      findStalePending: jest.fn(),
    };
    paymentEngine = { submitNativePayment: jest.fn() };
    stellarClient = {
      getNetwork: jest.fn().mockReturnValue('testnet'),
      horizon: { friendbot: jest.fn() },
    };

    service = new PaymentsService(
      stellarAccountRepository as unknown as StellarAccountRepository,
      transactionRepository as unknown as TransactionRepository,
      stellarClient as unknown as DefaultStellarClient,
      paymentEngine as unknown as StellarPaymentEngine,
      {
        getOrThrow: jest.fn().mockReturnValue(ENCRYPTION_KEY),
      } as unknown as ConfigService,
    );
  });

  describe('sendPayment', () => {
    it('sends a payment and marks the transaction SUCCESS', async () => {
      stellarAccountRepository.findByUserId.mockResolvedValue(buildAccount());
      transactionRepository.create.mockResolvedValue(buildTransaction());
      paymentEngine.submitNativePayment.mockResolvedValue({
        hash: 'tx-hash',
        ledger: 1,
      });
      transactionRepository.updateStatus.mockImplementation(
        (_id: string, update: object) => buildTransaction({ ...update }),
      );

      const result = await service.sendPayment('user-1', {
        destinationPublicKey: 'GDEST',
        amount: '10',
      });

      expect(result.status).toBe('SUCCESS');
      expect(result.stellarTxHash).toBe('tx-hash');
    });

    it('marks the transaction FAILED and throws when Stellar submission fails', async () => {
      stellarAccountRepository.findByUserId.mockResolvedValue(buildAccount());
      transactionRepository.create.mockResolvedValue(buildTransaction());
      paymentEngine.submitNativePayment.mockRejectedValue(
        new StellarPaymentError('insufficient_balance', 'not enough funds'),
      );
      transactionRepository.updateStatus.mockResolvedValue(
        buildTransaction({ status: 'FAILED' }),
      );

      await expect(
        service.sendPayment('user-1', {
          destinationPublicKey: 'GDEST',
          amount: '10',
        }),
      ).rejects.toBeInstanceOf(PaymentFailedError);
      expect(transactionRepository.updateStatus).toHaveBeenCalledWith(
        'tx-1',
        expect.objectContaining({
          status: 'FAILED',
          failureCode: 'insufficient_balance',
        }),
      );
    });

    it('returns the existing transaction on a duplicate idempotency key instead of resubmitting', async () => {
      stellarAccountRepository.findByUserId.mockResolvedValue(buildAccount());
      transactionRepository.create.mockRejectedValue(
        new DuplicateIdempotencyKeyError('key-1'),
      );
      const existing = buildTransaction({
        status: 'SUCCESS',
        stellarTxHash: 'already-done',
      });
      transactionRepository.findByIdempotencyKey.mockResolvedValue(existing);

      const result = await service.sendPayment('user-1', {
        destinationPublicKey: 'GDEST',
        amount: '10',
        idempotencyKey: 'key-1',
      });

      expect(result).toBe(existing);
      expect(paymentEngine.submitNativePayment).not.toHaveBeenCalled();
    });

    it('provisions a Stellar account on first use and funds it via Friendbot on testnet', async () => {
      stellarAccountRepository.findByUserId.mockResolvedValue(null);
      stellarAccountRepository.create.mockResolvedValue(buildAccount());
      transactionRepository.create.mockResolvedValue(buildTransaction());
      paymentEngine.submitNativePayment.mockResolvedValue({
        hash: 'h',
        ledger: 1,
      });
      transactionRepository.updateStatus.mockResolvedValue(
        buildTransaction({ status: 'SUCCESS' }),
      );
      const friendbotCall = jest.fn().mockResolvedValue(undefined);
      stellarClient.horizon.friendbot.mockReturnValue({ call: friendbotCall });

      await service.sendPayment('user-1', {
        destinationPublicKey: 'GDEST',
        amount: '10',
      });

      expect(stellarAccountRepository.create).toHaveBeenCalled();
      expect(friendbotCall).toHaveBeenCalled();
    });
  });

  describe('getTransactionStatus', () => {
    it('returns a non-stale PENDING transaction as-is without reconciling', async () => {
      const fresh = buildTransaction({
        status: 'PENDING',
        createdAt: new Date(),
      });
      transactionRepository.findById.mockResolvedValue(fresh);
      stellarAccountRepository.findById.mockResolvedValue(buildAccount());

      const result = await service.getTransactionStatus('user-1', 'tx-1');

      expect(result).toBe(fresh);
    });

    it('throws NotFoundException for a transaction that does not exist', async () => {
      transactionRepository.findById.mockResolvedValue(null);

      await expect(
        service.getTransactionStatus('user-1', 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when the transaction belongs to another user', async () => {
      transactionRepository.findById.mockResolvedValue(buildTransaction());
      stellarAccountRepository.findById.mockResolvedValue(
        buildAccount({ userId: 'someone-else' }),
      );

      await expect(
        service.getTransactionStatus('user-1', 'tx-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('listTransactionHistory', () => {
    it('returns an empty page when the caller has no Stellar account yet', async () => {
      stellarAccountRepository.findByUserId.mockResolvedValue(null);

      const result = await service.listTransactionHistory('user-1', 1, 20);

      expect(result).toEqual({ transactions: [], total: 0 });
    });
  });
});
