import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { ReconciliationJob } from './reconciliation.job';
import type { PaymentsService } from './payments.service';
import type { TransactionRecord } from './transaction.repository';

function buildTransaction(
  overrides: Partial<TransactionRecord> = {},
): TransactionRecord {
  return {
    id: 'tx-1',
    idempotencyKey: 'key-1',
    stellarAccountId: 'account-1',
    destinationPublicKey: 'GDEST',
    amount: '10',
    memo: null,
    assetCode: null,
    assetIssuer: null,
    status: 'SUCCESS',
    stellarTxHash: 'hash',
    failureCode: null,
    failureReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('ReconciliationJob', () => {
  let job: ReconciliationJob;
  let paymentsService: { reconcilePendingTransactions: jest.Mock };
  let configService: { getOrThrow: jest.Mock };

  beforeEach(() => {
    jest.useFakeTimers();
    paymentsService = {
      reconcilePendingTransactions: jest.fn().mockResolvedValue([]),
    };
    configService = { getOrThrow: jest.fn().mockReturnValue(120_000) };
    job = new ReconciliationJob(
      paymentsService as unknown as PaymentsService,
      configService as unknown as ConfigService,
    );
  });

  afterEach(() => {
    job.onModuleDestroy();
    jest.useRealTimers();
  });

  describe('runOnce', () => {
    it('invokes PaymentsService.reconcilePendingTransactions', async () => {
      await job.runOnce();
      expect(
        paymentsService.reconcilePendingTransactions,
      ).toHaveBeenCalledTimes(1);
    });

    it('skips a run if the previous one is still in flight', async () => {
      let resolveFirst!: (value: TransactionRecord[]) => void;
      paymentsService.reconcilePendingTransactions.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
      );

      const first = job.runOnce();
      const second = job.runOnce();

      expect(
        paymentsService.reconcilePendingTransactions,
      ).toHaveBeenCalledTimes(1);
      resolveFirst([]);
      await first;
      await second;
    });

    it('allows a new run once the previous one finishes', async () => {
      await job.runOnce();
      await job.runOnce();
      expect(
        paymentsService.reconcilePendingTransactions,
      ).toHaveBeenCalledTimes(2);
    });

    it('does not throw when PaymentsService rejects, and clears the in-flight flag', async () => {
      paymentsService.reconcilePendingTransactions.mockRejectedValueOnce(
        new Error('horizon down'),
      );

      await expect(job.runOnce()).resolves.toBeUndefined();

      paymentsService.reconcilePendingTransactions.mockResolvedValueOnce([]);
      await job.runOnce();
      expect(
        paymentsService.reconcilePendingTransactions,
      ).toHaveBeenCalledTimes(2);
    });

    it('logs a summary of how many transactions landed in each status', async () => {
      paymentsService.reconcilePendingTransactions.mockResolvedValueOnce([
        buildTransaction({ status: 'SUCCESS' }),
        buildTransaction({ status: 'SUCCESS' }),
        buildTransaction({ status: 'NEEDS_REVIEW' }),
      ]);
      const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();

      await job.runOnce();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('"SUCCESS":2'),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('"NEEDS_REVIEW":1'),
      );
    });
  });

  describe('onModuleInit / onModuleDestroy', () => {
    it('schedules runOnce on the configured interval', () => {
      const runOnceSpy = jest
        .spyOn(job, 'runOnce')
        .mockResolvedValue(undefined);

      job.onModuleInit();
      expect(runOnceSpy).not.toHaveBeenCalled();

      jest.advanceTimersByTime(120_000);
      expect(runOnceSpy).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(120_000);
      expect(runOnceSpy).toHaveBeenCalledTimes(2);
    });

    it('stops scheduling once destroyed', () => {
      const runOnceSpy = jest
        .spyOn(job, 'runOnce')
        .mockResolvedValue(undefined);

      job.onModuleInit();
      job.onModuleDestroy();
      jest.advanceTimersByTime(500_000);

      expect(runOnceSpy).not.toHaveBeenCalled();
    });
  });
});
