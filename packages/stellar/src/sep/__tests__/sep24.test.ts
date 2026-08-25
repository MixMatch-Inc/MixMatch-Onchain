import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getSep24Transaction,
  initiateSep24Deposit,
  initiateSep24Withdraw,
  SEP24_FAILURE_STATUSES,
  SEP24_IN_PROGRESS_STATUSES,
} from '../sep24.js';

const TRANSFER_SERVER_SEP24 = 'https://testanchor.stellar.org/sep24';
const JWT = 'fake-jwt';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('initiateSep24Deposit', () => {
  it('posts a multipart form with the asset code, account, and amount, authenticated with the JWT', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ type: 'interactive_customer_info_needed', url: 'https://anchor/kyc', id: 'tx-1' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await initiateSep24Deposit({
      transferServerSep24: TRANSFER_SERVER_SEP24,
      jwt: JWT,
      assetCode: 'SRT',
      account: 'GACCOUNT',
      amount: '10',
    });

    expect(result).toEqual({ type: 'interactive_customer_info_needed', url: 'https://anchor/kyc', id: 'tx-1' });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${TRANSFER_SERVER_SEP24}/transactions/deposit/interactive`);
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${JWT}`);
    const body = init.body as FormData;
    expect(body.get('asset_code')).toBe('SRT');
    expect(body.get('account')).toBe('GACCOUNT');
    expect(body.get('amount')).toBe('10');
  });

  it('throws with the anchor error body when the request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 400, text: () => Promise.resolve('{"error":"bad asset"}') }),
    );

    await expect(
      initiateSep24Deposit({ transferServerSep24: TRANSFER_SERVER_SEP24, jwt: JWT, assetCode: 'BAD' }),
    ).rejects.toThrow('HTTP 400');
  });
});

describe('initiateSep24Withdraw', () => {
  it('posts to the withdraw/interactive endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ type: 'interactive_customer_info_needed', url: 'https://anchor/withdraw', id: 'tx-2' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await initiateSep24Withdraw({
      transferServerSep24: TRANSFER_SERVER_SEP24,
      jwt: JWT,
      assetCode: 'SRT',
    });

    expect(result.id).toBe('tx-2');
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe(`${TRANSFER_SERVER_SEP24}/transactions/withdraw/interactive`);
  });
});

describe('getSep24Transaction', () => {
  it('fetches and maps a transaction record to camelCase', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          transaction: {
            id: 'tx-1',
            kind: 'deposit',
            status: 'completed',
            amount_in: '10.0000000',
            amount_out: '9.5000000',
            started_at: '2026-01-01T00:00:00Z',
            completed_at: '2026-01-01T00:05:00Z',
            more_info_url: 'https://anchor/more-info',
            stellar_transaction_id: 'abcd',
            external_transaction_id: 'ext-1',
          },
        }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const transaction = await getSep24Transaction({ transferServerSep24: TRANSFER_SERVER_SEP24, jwt: JWT, id: 'tx-1' });

    expect(transaction).toEqual({
      id: 'tx-1',
      kind: 'deposit',
      status: 'completed',
      amountIn: '10.0000000',
      amountOut: '9.5000000',
      startedAt: '2026-01-01T00:00:00Z',
      completedAt: '2026-01-01T00:05:00Z',
      moreInfoUrl: 'https://anchor/more-info',
      stellarTransactionId: 'abcd',
      externalTransactionId: 'ext-1',
      message: null,
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${TRANSFER_SERVER_SEP24}/transaction?id=tx-1`);
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${JWT}`);
  });

  it('maps missing optional fields to null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          transaction: { id: 'tx-2', kind: 'withdrawal', status: 'incomplete', started_at: '2026-01-01T00:00:00Z' },
        }),
    }));

    const transaction = await getSep24Transaction({ transferServerSep24: TRANSFER_SERVER_SEP24, jwt: JWT, id: 'tx-2' });

    expect(transaction.amountIn).toBeNull();
    expect(transaction.completedAt).toBeNull();
    expect(transaction.stellarTransactionId).toBeNull();
  });
});

describe('SEP24_IN_PROGRESS_STATUSES / SEP24_FAILURE_STATUSES', () => {
  it('are disjoint and cover every non-terminal-success status', () => {
    for (const status of SEP24_IN_PROGRESS_STATUSES) {
      expect(SEP24_FAILURE_STATUSES.has(status)).toBe(false);
    }
    expect(SEP24_IN_PROGRESS_STATUSES.has('completed')).toBe(false);
    expect(SEP24_FAILURE_STATUSES.has('completed')).toBe(false);
    expect(SEP24_FAILURE_STATUSES.has('expired')).toBe(true);
    expect(SEP24_IN_PROGRESS_STATUSES.has('pending_anchor')).toBe(true);
  });
});
