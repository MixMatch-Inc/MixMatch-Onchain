import { ApiError } from '../services/api-client';
import {
  getMyAccount,
  getTransactionHistory,
  getTransactionStatus,
  reconcileTransaction,
  sendPayment,
} from '../services/payments-client';

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const TRANSACTION = {
  id: 'tx-1',
  idempotencyKey: 'key-1',
  stellarAccountId: 'account-1',
  destinationPublicKey: 'GBQEMWFEPUDYZ3NQOIFIW3WDGUJVOA2ABYZ66DSDDHMKYLIKFZ6OSILE',
  amount: '10',
  memo: null,
  status: 'SUCCESS',
  stellarTxHash: 'tx-hash',
  failureCode: null,
  failureReason: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('payments-client', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('sendPayment', () => {
    it('posts to /api/payments/send with an auth header and returns the transaction', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ transaction: TRANSACTION }) });

      const result = await sendPayment(
        { destinationPublicKey: TRANSACTION.destinationPublicKey, amount: '10' },
        'token-123',
      );

      expect(result.transaction).toEqual(TRANSACTION);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/payments/send');
      expect(options.method).toBe('POST');
      expect(options.headers.Authorization).toBe('Bearer token-123');
    });

    it('throws ApiError on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: { message: 'Insufficient balance', code: 'INSUFFICIENT_BALANCE' } }),
      });

      await expect(
        sendPayment({ destinationPublicKey: TRANSACTION.destinationPublicKey, amount: '10' }, 'token-123'),
      ).rejects.toThrow(ApiError);
    });
  });

  describe('getTransactionStatus', () => {
    it('fetches the transaction status with an auth header', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ transaction: TRANSACTION }) });

      const result = await getTransactionStatus('tx-1', 'token-123');

      expect(result.transaction.id).toBe('tx-1');
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/payments/tx-1/status');
      expect(options.headers.Authorization).toBe('Bearer token-123');
    });
  });

  describe('getTransactionHistory', () => {
    it('includes page and limit as query params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [TRANSACTION], total: 1, page: 2, limit: 5 }),
      });

      const result = await getTransactionHistory({ page: 2, limit: 5 }, 'token-123');

      expect(result.total).toBe(1);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('page=2');
      expect(url).toContain('limit=5');
    });

    it('omits query params entirely when none are given', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [], total: 0, page: 1, limit: 20 }),
      });

      await getTransactionHistory({}, 'token-123');

      const [url] = mockFetch.mock.calls[0];
      expect(url).not.toContain('?');
    });
  });

  describe('reconcileTransaction', () => {
    it('posts to the reconcile endpoint', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ transaction: TRANSACTION }) });

      const result = await reconcileTransaction('tx-1', 'token-123');

      expect(result.transaction.id).toBe('tx-1');
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/payments/tx-1/reconcile');
      expect(options.method).toBe('POST');
    });
  });

  describe('getMyAccount', () => {
    it('fetches the caller account with an auth header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ account: { publicKey: TRANSACTION.destinationPublicKey, network: 'testnet' } }),
      });

      const result = await getMyAccount('token-123');

      expect(result.account.publicKey).toBe(TRANSACTION.destinationPublicKey);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/payments/account');
      expect(options.headers.Authorization).toBe('Bearer token-123');
    });
  });
});
