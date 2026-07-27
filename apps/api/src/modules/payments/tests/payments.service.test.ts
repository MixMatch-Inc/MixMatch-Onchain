import { describe, expect, it, vi } from 'vitest';
import { StellarPaymentService as StellarPaymentEngine } from '@mixmatch/stellar';
import { PaymentsService } from '../payments.service.js';
import { InMemoryStellarAccountRepository } from '../stellar-account.repository.js';
import { InMemoryTransactionRepository } from '../transaction.repository.js';
import type { TransactionRecord } from '../payments.types.js';
import type { TransactionRepository } from '../transaction.repository.js';
import type { StellarAccountRepository } from '../stellar-account.repository.js';
import { fakeStellarClient } from './fake-stellar-client.js';
import { DESTINATION_PUBLIC_KEY } from './fixtures.js';
import { NotFoundError } from '../../../shared/errors/AppError.js';
import { ForbiddenError } from '../../../shared/errors/AuthErrors.js';
import { PaymentFailedError } from '../payment-errors.js';

function buildService(overrides: { submitTransaction?: (tx: unknown) => Promise<unknown>; paymentRecords?: unknown[] } = {}) {
  const stellarAccountRepository = new InMemoryStellarAccountRepository();
  const transactionRepository = new InMemoryTransactionRepository();
  const stellarClient = fakeStellarClient(overrides);
  const paymentEngine = new StellarPaymentEngine(stellarClient);
  const service = new PaymentsService(stellarAccountRepository, transactionRepository, stellarClient, paymentEngine);
  return { service, stellarAccountRepository, transactionRepository, stellarClient };
}

describe('PaymentsService.getOrCreateStellarAccount', () => {
  it('provisions and funds a new account on first use (testnet)', async () => {
    const friendbotCall = vi.fn().mockResolvedValue({});
    const { service } = buildService({});
    // Rebuild with a spy-able friendbot call.
    const stellarAccountRepository = new InMemoryStellarAccountRepository();
    const transactionRepository = new InMemoryTransactionRepository();
    const stellarClient = fakeStellarClient({});
    (stellarClient.horizon as unknown as { friendbot: () => { call: typeof friendbotCall } }).friendbot = () => ({
      call: friendbotCall,
    });
    const paymentEngine = new StellarPaymentEngine(stellarClient);
    const spiedService = new PaymentsService(stellarAccountRepository, transactionRepository, stellarClient, paymentEngine);

    const account = await spiedService.getOrCreateStellarAccount('user-1');

    expect(account.userId).toBe('user-1');
    expect(account.publicKey).toMatch(/^G[A-Z0-9]{55}$/);
    expect(account.network).toBe('testnet');
    expect(friendbotCall).toHaveBeenCalledTimes(1);
    void service;
  });

  it('returns the same account on subsequent calls without re-provisioning', async () => {
    const { service } = buildService({});
    const first = await service.getOrCreateStellarAccount('user-1');
    const second = await service.getOrCreateStellarAccount('user-1');
    expect(second.id).toBe(first.id);
    expect(second.publicKey).toBe(first.publicKey);
  });
});

describe('PaymentsService.sendPayment', () => {
  it('submits a payment and persists it as SUCCESS with the returned tx hash', async () => {
    const { service, transactionRepository } = buildService({
      submitTransaction: async () => ({ hash: 'tx-hash-1', ledger: 5, successful: true }),
    });

    const transaction = await service.sendPayment('user-1', {
      destinationPublicKey: DESTINATION_PUBLIC_KEY,
      amount: '10',
    });

    expect(transaction.status).toBe('SUCCESS');
    expect(transaction.stellarTxHash).toBe('tx-hash-1');

    const stored = await transactionRepository.findById(transaction.id);
    expect(stored?.status).toBe('SUCCESS');
  });

  it('persists a failed submission as FAILED and throws a classified PaymentFailedError', async () => {
    const { StellarPaymentError } = await import('@mixmatch/stellar');
    const { service, transactionRepository } = buildService({
      submitTransaction: async () => {
        throw new StellarPaymentError('insufficient_balance', 'not enough funds');
      },
    });

    await expect(
      service.sendPayment('user-1', {
        destinationPublicKey: DESTINATION_PUBLIC_KEY,
        amount: '10',
      }),
    ).rejects.toThrow(PaymentFailedError);

    const [stored] = (await transactionRepository.listByStellarAccountId(
      (await service.getOrCreateStellarAccount('user-1')).id,
      1,
      10,
    )).transactions;
    expect(stored?.status).toBe('FAILED');
    expect(stored?.failureCode).toBe('insufficient_balance');
  });

  it('does not submit twice for a repeated idempotency key', async () => {
    const submitTransaction = vi.fn(async () => ({ hash: 'tx-hash-once', ledger: 1, successful: true }));
    const { service } = buildService({ submitTransaction });

    const params = {
      destinationPublicKey: DESTINATION_PUBLIC_KEY,
      amount: '10',
      idempotencyKey: 'order-42',
    };

    const first = await service.sendPayment('user-1', params);
    const second = await service.sendPayment('user-1', params);

    expect(submitTransaction).toHaveBeenCalledTimes(1);
    expect(second.id).toBe(first.id);
    expect(second.stellarTxHash).toBe(first.stellarTxHash);
  });

  it('generates its own idempotency key when the caller omits one (no dedup across separate calls)', async () => {
    const submitTransaction = vi.fn(async () => ({ hash: 'tx-hash', ledger: 1, successful: true }));
    const { service } = buildService({ submitTransaction });
    const params = {
      destinationPublicKey: DESTINATION_PUBLIC_KEY,
      amount: '10',
    };

    await service.sendPayment('user-1', params);
    await service.sendPayment('user-1', params);

    expect(submitTransaction).toHaveBeenCalledTimes(2);
  });
});

describe('PaymentsService transaction ownership', () => {
  it('throws NotFoundError for a transaction that does not exist', async () => {
    const { service } = buildService({});
    await expect(service.getTransactionStatus('user-1', 'does-not-exist')).rejects.toThrow(NotFoundError);
  });

  it('throws ForbiddenError when a different user requests the transaction', async () => {
    const { service } = buildService({
      submitTransaction: async () => ({ hash: 'tx-hash', ledger: 1, successful: true }),
    });
    const transaction = await service.sendPayment('user-1', {
      destinationPublicKey: DESTINATION_PUBLIC_KEY,
      amount: '10',
    });

    await expect(service.getTransactionStatus('user-2', transaction.id)).rejects.toThrow(ForbiddenError);
  });
});

describe('PaymentsService reconciliation', () => {
  function fakeRecord(overrides: Partial<TransactionRecord> = {}): TransactionRecord {
    return {
      id: 'tx-1',
      idempotencyKey: 'key-1',
      stellarAccountId: 'account-1',
      destinationPublicKey: DESTINATION_PUBLIC_KEY,
      amount: '10',
      memo: null,
      status: 'PENDING',
      stellarTxHash: null,
      failureCode: null,
      failureReason: null,
      createdAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago — well past the reconciliation window
      updatedAt: new Date(),
      ...overrides,
    };
  }

  function fakeTransactionRepository(initial: TransactionRecord): TransactionRepository & { updated: TransactionRecord[] } {
    const updated: TransactionRecord[] = [];
    let current = initial;
    return {
      updated,
      async findById(id) {
        return id === current.id ? current : null;
      },
      async findByIdempotencyKey() {
        return null;
      },
      async create() {
        throw new Error('not used in this test');
      },
      async updateStatus(id, update) {
        current = { ...current, ...update, updatedAt: new Date() };
        updated.push(current);
        return current;
      },
      async listByStellarAccountId() {
        return { transactions: [current], total: 1 };
      },
      async findStalePending() {
        return current.status === 'PENDING' ? [current] : [];
      },
    };
  }

  function fakeAccountRepository(userId: string, publicKey: string): StellarAccountRepository {
    const account = {
      id: 'account-1',
      userId,
      publicKey,
      encryptedSecretKey: 'unused',
      network: 'testnet' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return {
      async findByUserId(id) {
        return id === userId ? account : null;
      },
      async findById(id) {
        return id === account.id ? account : null;
      },
      async create() {
        return account;
      },
    };
  }

  it('marks a stale PENDING transaction SUCCESS when a matching payment is found on-chain', async () => {
    const record = fakeRecord();
    const transactionRepository = fakeTransactionRepository(record);
    const accountRepository = fakeAccountRepository('user-1', 'GSOURCE0000000000000000000000000000000000000000000000000');
    const stellarClient = fakeStellarClient({
      paymentRecords: [
        {
          type: 'payment',
          asset_type: 'native',
          to: record.destinationPublicKey,
          amount: '10.0000000',
          created_at: new Date(record.createdAt.getTime() + 1000).toISOString(),
          transaction_hash: 'matched-hash',
        },
      ],
    });
    const paymentEngine = new StellarPaymentEngine(stellarClient);
    const service = new PaymentsService(accountRepository, transactionRepository, stellarClient, paymentEngine);

    const result = await service.getTransactionStatus('user-1', record.id);

    expect(result.status).toBe('SUCCESS');
    expect(result.stellarTxHash).toBe('matched-hash');
  });

  it('marks a stale PENDING transaction FAILED when no matching payment is found', async () => {
    const record = fakeRecord();
    const transactionRepository = fakeTransactionRepository(record);
    const accountRepository = fakeAccountRepository('user-1', 'GSOURCE0000000000000000000000000000000000000000000000000');
    const stellarClient = fakeStellarClient({ paymentRecords: [] });
    const paymentEngine = new StellarPaymentEngine(stellarClient);
    const service = new PaymentsService(accountRepository, transactionRepository, stellarClient, paymentEngine);

    const result = await service.getTransactionStatus('user-1', record.id);

    expect(result.status).toBe('FAILED');
    expect(result.failureCode).toBe('reconciliation_timeout');
  });

  it('leaves a recent (non-stale) PENDING transaction untouched even with no match', async () => {
    const record = fakeRecord({ createdAt: new Date() });
    const transactionRepository = fakeTransactionRepository(record);
    const accountRepository = fakeAccountRepository('user-1', 'GSOURCE0000000000000000000000000000000000000000000000000');
    const stellarClient = fakeStellarClient({ paymentRecords: [] });
    const paymentEngine = new StellarPaymentEngine(stellarClient);
    const service = new PaymentsService(accountRepository, transactionRepository, stellarClient, paymentEngine);

    const result = await service.getTransactionStatus('user-1', record.id);

    expect(result.status).toBe('PENDING');
  });

  it('reconcilePendingTransactions batch-reconciles every stale PENDING transaction', async () => {
    const record = fakeRecord();
    const transactionRepository = fakeTransactionRepository(record);
    const accountRepository = fakeAccountRepository('user-1', 'GSOURCE0000000000000000000000000000000000000000000000000');
    const stellarClient = fakeStellarClient({
      paymentRecords: [
        {
          type: 'payment',
          asset_type: 'native',
          to: record.destinationPublicKey,
          amount: '10.0000000',
          created_at: new Date(record.createdAt.getTime() + 1000).toISOString(),
          transaction_hash: 'batch-matched-hash',
        },
      ],
    });
    const paymentEngine = new StellarPaymentEngine(stellarClient);
    const service = new PaymentsService(accountRepository, transactionRepository, stellarClient, paymentEngine);

    const results = await service.reconcilePendingTransactions();

    expect(results).toHaveLength(1);
    expect(results[0]?.status).toBe('SUCCESS');
  });
});
