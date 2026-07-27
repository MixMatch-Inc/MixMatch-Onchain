import { act, renderHook } from '@testing-library/react-native';
import { useTransactionPolling } from '../hooks/use-transaction-polling';

jest.mock('../services/payments-client', () => ({
  getTransactionStatus: jest.fn(),
}));

import { getTransactionStatus } from '../services/payments-client';

const PENDING_TX = {
  id: 'tx-1',
  idempotencyKey: 'key-1',
  stellarAccountId: 'account-1',
  destinationPublicKey: 'GBQEMWFEPUDYZ3NQOIFIW3WDGUJVOA2ABYZ66DSDDHMKYLIKFZ6OSILE',
  amount: '10',
  memo: null,
  status: 'PENDING' as const,
  stellarTxHash: null,
  failureCode: null,
  failureReason: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const SUCCESS_TX = { ...PENDING_TX, status: 'SUCCESS' as const, stellarTxHash: 'abc123' };

async function flush(ms = 0) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

describe('useTransactionPolling', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (getTransactionStatus as jest.Mock).mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does nothing when there is no transactionId or accessToken', async () => {
    const { result } = renderHook(() => useTransactionPolling(null, null));
    await flush();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.transaction).toBeNull();
    expect(getTransactionStatus).not.toHaveBeenCalled();
  });

  it('fetches the status immediately on mount', async () => {
    (getTransactionStatus as jest.Mock).mockResolvedValue({ transaction: SUCCESS_TX });

    const { result } = renderHook(() => useTransactionPolling('tx-1', 'token-123'));
    await flush();

    expect(result.current.transaction).toEqual(SUCCESS_TX);
    expect(getTransactionStatus).toHaveBeenCalledWith('tx-1', 'token-123');
  });

  it('polls again while the transaction is PENDING, and stops once it succeeds', async () => {
    (getTransactionStatus as jest.Mock)
      .mockResolvedValueOnce({ transaction: PENDING_TX })
      .mockResolvedValueOnce({ transaction: SUCCESS_TX });

    const { result } = renderHook(() => useTransactionPolling('tx-1', 'token-123', 1000));
    await flush();

    expect(result.current.transaction).toEqual(PENDING_TX);
    expect(getTransactionStatus).toHaveBeenCalledTimes(1);

    await flush(1000);

    expect(result.current.transaction).toEqual(SUCCESS_TX);
    expect(getTransactionStatus).toHaveBeenCalledTimes(2);

    await flush(5000);
    expect(getTransactionStatus).toHaveBeenCalledTimes(2);
  });

  it('stops polling and records an error when the request fails', async () => {
    (getTransactionStatus as jest.Mock).mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useTransactionPolling('tx-1', 'token-123', 1000));
    await flush();

    expect(result.current.error).toBe('network down');
    expect(result.current.isLoading).toBe(false);

    await flush(5000);
    expect(getTransactionStatus).toHaveBeenCalledTimes(1);
  });

  it('stops polling after unmount', async () => {
    (getTransactionStatus as jest.Mock).mockResolvedValue({ transaction: PENDING_TX });

    const { unmount } = renderHook(() => useTransactionPolling('tx-1', 'token-123', 1000));
    await flush();
    expect(getTransactionStatus).toHaveBeenCalledTimes(1);

    unmount();
    await flush(5000);
    expect(getTransactionStatus).toHaveBeenCalledTimes(1);
  });
});
