import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTransactionPolling } from '../use-transaction-polling';

vi.mock('../payments-client', () => ({
  getTransactionStatus: vi.fn(),
}));

import { getTransactionStatus } from '../payments-client';

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

// `waitFor`/`findBy*` poll using real timers internally, which hangs forever
// once `vi.useFakeTimers()` is active. Instead we flush microtasks/timers
// explicitly with `act(async () => { await vi.advanceTimersByTimeAsync(...) })`
// and assert on the hook's return value directly.
async function flush(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe('useTransactionPolling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(getTransactionStatus).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does nothing when there is no transactionId or accessToken', async () => {
    const { result } = renderHook(() => useTransactionPolling(null, null));
    await flush();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.transaction).toBeNull();
    expect(getTransactionStatus).not.toHaveBeenCalled();
  });

  it('fetches the status immediately on mount', async () => {
    vi.mocked(getTransactionStatus).mockResolvedValue({ transaction: SUCCESS_TX });

    const { result } = renderHook(() => useTransactionPolling('tx-1', 'token-123'));
    await flush();

    expect(result.current.transaction).toEqual(SUCCESS_TX);
    expect(getTransactionStatus).toHaveBeenCalledWith('tx-1', 'token-123');
  });

  it('polls again while the transaction is PENDING, and stops once it succeeds', async () => {
    vi.mocked(getTransactionStatus)
      .mockResolvedValueOnce({ transaction: PENDING_TX })
      .mockResolvedValueOnce({ transaction: SUCCESS_TX });

    const { result } = renderHook(() => useTransactionPolling('tx-1', 'token-123', 1000));
    await flush();

    expect(result.current.transaction).toEqual(PENDING_TX);
    expect(getTransactionStatus).toHaveBeenCalledTimes(1);

    await flush(1000);

    expect(result.current.transaction).toEqual(SUCCESS_TX);
    expect(getTransactionStatus).toHaveBeenCalledTimes(2);

    // No further polling once terminal.
    await flush(5000);
    expect(getTransactionStatus).toHaveBeenCalledTimes(2);
  });

  it('stops polling and records an error when the request fails', async () => {
    vi.mocked(getTransactionStatus).mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useTransactionPolling('tx-1', 'token-123', 1000));
    await flush();

    expect(result.current.error).toBe('network down');
    expect(result.current.isLoading).toBe(false);

    await flush(5000);
    expect(getTransactionStatus).toHaveBeenCalledTimes(1);
  });

  it('stops polling after unmount', async () => {
    vi.mocked(getTransactionStatus).mockResolvedValue({ transaction: PENDING_TX });

    const { unmount } = renderHook(() => useTransactionPolling('tx-1', 'token-123', 1000));
    await flush();
    expect(getTransactionStatus).toHaveBeenCalledTimes(1);

    unmount();
    await flush(5000);
    expect(getTransactionStatus).toHaveBeenCalledTimes(1);
  });
});
