'use client';

import { depositAnchorSchema, withdrawAnchorSchema, type AnchorTransactionRecord } from '@mixmatch/shared';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { depositAnchor, getAnchorHistory, getAnchorStatus, withdrawAnchor } from '../../lib/anchor-client';
import { useAuth } from '../../lib/useAuth';

type Kind = 'deposit' | 'withdraw';

const STATUS_LABEL: Record<AnchorTransactionRecord['status'], string> = {
  incomplete: 'Waiting on you (open the anchor link)',
  pending_user_transfer_start: 'Waiting for your transfer to start',
  pending_user_transfer_complete: 'Waiting for your transfer to complete',
  pending_external: 'Waiting on an external network',
  pending_anchor: 'Anchor is processing',
  pending_stellar: 'Submitted to Stellar',
  pending_trust: 'Waiting on a trustline',
  pending_user: 'Waiting on you',
  on_hold: 'Under review',
  completed: 'Completed',
  refunded: 'Refunded',
  expired: 'Expired',
  error: 'Failed',
};

export default function AnchorPage() {
  const router = useRouter();
  const { user, accessToken, isLoading, logout } = useAuth();

  const [kind, setKind] = useState<Kind>('deposit');
  const [assetCode, setAssetCode] = useState('SRT');
  const [amount, setAmount] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [transactions, setTransactions] = useState<AnchorTransactionRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!accessToken) return;
    setIsLoadingHistory(true);
    try {
      const { transactions: rows } = await getAnchorHistory(accessToken);
      setTransactions(rows);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!isLoading && !accessToken) {
      router.push('/login');
    }
  }, [isLoading, accessToken, router]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!accessToken) return;

    const schema = kind === 'deposit' ? depositAnchorSchema : withdrawAnchorSchema;
    const result = schema.safeParse({ assetCode, amount: amount || undefined });
    if (!result.success) {
      setFormError(result.error.issues[0]?.message ?? 'Invalid input');
      return;
    }

    setIsSubmitting(true);
    try {
      const action = kind === 'deposit' ? depositAnchor : withdrawAnchor;
      const { transaction, interactiveUrl } = await action(result.data, accessToken);
      setTransactions((prev) => [transaction, ...prev]);
      window.open(interactiveUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefresh = async (id: string) => {
    if (!accessToken) return;
    setRefreshingId(id);
    try {
      const { transaction } = await getAnchorStatus(id, accessToken);
      setTransactions((prev) => prev.map((row) => (row.id === id ? transaction : row)));
    } finally {
      setRefreshingId(null);
    }
  };

  if (isLoading || !accessToken) {
    return null;
  }

  return (
    <main style={{ maxWidth: 640, margin: '40px auto', padding: '0 16px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Deposit / Withdraw</h1>
        <button type="button" onClick={logout} data-testid="logout-button">
          Log out
        </button>
      </div>
      {user && <p style={{ color: '#666' }}>Signed in as {user.email}</p>}

      <form onSubmit={(event) => void handleSubmit(event)} style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button type="button" onClick={() => setKind('deposit')} disabled={kind === 'deposit'} data-testid="tab-deposit">
            Deposit
          </button>
          <button type="button" onClick={() => setKind('withdraw')} disabled={kind === 'withdraw'} data-testid="tab-withdraw">
            Withdraw
          </button>
        </div>

        <label style={{ display: 'block', marginBottom: 12 }}>
          Asset code
          <input
            value={assetCode}
            onChange={(event) => setAssetCode(event.target.value)}
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
            data-testid="asset-code-input"
          />
        </label>

        <label style={{ display: 'block', marginBottom: 12 }}>
          Amount (optional — the anchor can also ask for this)
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
            data-testid="amount-input"
          />
        </label>

        {formError && <p style={{ color: 'crimson' }}>{formError}</p>}

        <button type="submit" disabled={isSubmitting} data-testid="submit-button">
          {isSubmitting ? 'Starting…' : kind === 'deposit' ? 'Start deposit' : 'Start withdrawal'}
        </button>
      </form>

      <h2 style={{ marginTop: 40 }}>History</h2>
      {isLoadingHistory && <p>Loading…</p>}
      {!isLoadingHistory && transactions.length === 0 && <p>No anchor transactions yet.</p>}
      <ul style={{ listStyle: 'none', padding: 0 }} data-testid="anchor-history">
        {transactions.map((transaction) => (
          <li
            key={transaction.id}
            style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 8 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>
                {transaction.kind === 'deposit' ? 'Deposit' : 'Withdraw'} {transaction.assetCode}
              </strong>
              <button
                type="button"
                onClick={() => void handleRefresh(transaction.id)}
                disabled={refreshingId === transaction.id}
              >
                {refreshingId === transaction.id ? 'Refreshing…' : 'Refresh status'}
              </button>
            </div>
            <p style={{ margin: '4px 0' }}>{STATUS_LABEL[transaction.status]}</p>
            {transaction.amountIn && (
              <p style={{ margin: '4px 0', color: '#666' }}>
                In: {transaction.amountIn}
                {transaction.amountOut ? ` — Out: ${transaction.amountOut}` : ''}
              </p>
            )}
            {transaction.interactiveUrl && SEP24_INCOMPLETE_STATUSES.has(transaction.status) && (
              <a href={transaction.interactiveUrl} target="_blank" rel="noopener noreferrer">
                Continue on the anchor&rsquo;s site
              </a>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}

const SEP24_INCOMPLETE_STATUSES = new Set<AnchorTransactionRecord['status']>([
  'incomplete',
  'pending_user',
]);
