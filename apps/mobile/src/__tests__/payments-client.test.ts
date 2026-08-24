import {
  getStellarAccount,
  getTransactionHistory,
  getTransactionStatus,
  reconcileTransaction,
  sendPayment,
} from '../services/payments-client';

describe('payments-client', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  it('sendPayment posts to /payments/send with an auth header', async () => {
    await sendPayment({ destinationPublicKey: 'G'.repeat(56), amount: '10' }, 'tok');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/payments/send');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body)).toEqual({ destinationPublicKey: 'G'.repeat(56), amount: '10' });
  });

  it('getStellarAccount hits /payments/account', async () => {
    await getStellarAccount('tok');
    expect(fetchMock.mock.calls[0][0]).toContain('/payments/account');
  });

  it('getTransactionStatus hits /payments/:id/status', async () => {
    await getTransactionStatus('tx-1', 'tok');
    expect(fetchMock.mock.calls[0][0]).toContain('/payments/tx-1/status');
  });

  it('getTransactionHistory omits query params when not provided', async () => {
    await getTransactionHistory({}, 'tok');
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/payments\/history$/);
  });

  it('getTransactionHistory includes page and limit when provided', async () => {
    await getTransactionHistory({ page: 2, limit: 10 }, 'tok');
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('page=2');
    expect(url).toContain('limit=10');
  });

  it('reconcileTransaction posts to /payments/:id/reconcile', async () => {
    await reconcileTransaction('tx-1', 'tok');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/payments/tx-1/reconcile');
    expect(init.method).toBe('POST');
  });
});
