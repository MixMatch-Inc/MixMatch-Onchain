import type { TransactionRecord } from '@mixmatch/shared';
import { useEffect, useState } from 'react';
import { getTransactionStatus } from '../services/payments-client';

const DEFAULT_POLL_INTERVAL_MS = 3000;

export interface UseTransactionPollingResult {
  transaction: TransactionRecord | null;
  error: string | null;
  isLoading: boolean;
}

/**
 * Polls `GET /api/payments/:id/status` while the transaction is `PENDING`,
 * stopping automatically once it reaches a terminal status (`SUCCESS` /
 * `FAILED`) or the component unmounts. Uses a self-scheduling `setTimeout`
 * (rather than `setInterval`) so a slow response can't cause overlapping
 * requests.
 */
export function useTransactionPolling(
  transactionId: string | null,
  accessToken: string | null,
  intervalMs: number = DEFAULT_POLL_INTERVAL_MS,
): UseTransactionPollingResult {
  const [transaction, setTransaction] = useState<TransactionRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!transactionId || !accessToken) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const { transaction: tx } = await getTransactionStatus(transactionId as string, accessToken as string);
        if (cancelled) return;

        setTransaction(tx);
        setError(null);
        setIsLoading(false);

        if (tx.status === 'PENDING') {
          timer = setTimeout(poll, intervalMs);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load transaction status');
        setIsLoading(false);
      }
    }

    setIsLoading(true);
    void poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [transactionId, accessToken, intervalMs]);

  return { transaction, error, isLoading };
}
