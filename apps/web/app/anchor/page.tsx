'use client';

import {
  depositAnchorSchema,
  withdrawAnchorSchema,
  type AnchorRateResponse,
  type AnchorTransactionRecord,
  type MessageKey,
} from '@mixmatch/shared';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { depositAnchor, getAnchorHistory, getAnchorRates, getAnchorStatus, withdrawAnchor } from '../../lib/anchor-client';
import { useT } from '../../lib/i18n';
import { useAuth } from '../../lib/useAuth';

type Kind = 'deposit' | 'withdraw';

export default function AnchorPage() {
  const router = useRouter();
  const { t } = useT();
  const { user, accessToken, isLoading, logout } = useAuth();

  const [kind, setKind] = useState<Kind>('deposit');
  const [assetCode, setAssetCode] = useState('SRT');
  const [amount, setAmount] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [transactions, setTransactions] = useState<AnchorTransactionRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [rate, setRate] = useState<AnchorRateResponse | null>(null);
  const [rateState, setRateState] = useState<'idle' | 'loading' | 'error'>('idle');

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

  // Fee shown before the interactive flow starts (#1402); debounced so typing an amount does not spam the API.
  useEffect(() => {
    if (!accessToken || !assetCode.trim()) {
      setRate(null);
      setRateState('idle');
      return;
    }
    setRateState('loading');
    const handle = setTimeout(() => {
      getAnchorRates(
        { assetCode: assetCode.trim(), operation: kind, amount: /^\d+(\.\d+)?$/.test(amount) ? amount : undefined },
        accessToken,
      )
        .then((result) => {
          setRate(result);
          setRateState('idle');
        })
        .catch(() => {
          setRate(null);
          setRateState('error');
        });
    }, 400);
    return () => clearTimeout(handle);
  }, [accessToken, assetCode, amount, kind]);

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
      setFormError(err instanceof Error ? err.message : t('common.somethingWrong'));
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
        <h1>{t('anchor.title')}</h1>
        <button type="button" onClick={logout} data-testid="logout-button">
          {t('common.logOut')}
        </button>
      </div>
      <LanguageSwitcher />
      {user && <p style={{ color: '#666' }}>{t('anchor.signedInAs', { email: user.email })}</p>}

      <form onSubmit={(event) => void handleSubmit(event)} style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button type="button" onClick={() => setKind('deposit')} disabled={kind === 'deposit'} data-testid="tab-deposit">
            {t('anchor.deposit')}
          </button>
          <button type="button" onClick={() => setKind('withdraw')} disabled={kind === 'withdraw'} data-testid="tab-withdraw">
            {t('anchor.withdraw')}
          </button>
        </div>

        <label style={{ display: 'block', marginBottom: 12 }}>
          {t('anchor.assetCode')}
          <input
            value={assetCode}
            onChange={(event) => setAssetCode(event.target.value)}
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
            data-testid="asset-code-input"
          />
        </label>

        <label style={{ display: 'block', marginBottom: 12 }}>
          {t('anchor.amountOptional')}
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
            data-testid="amount-input"
          />
        </label>

        <div role="status" aria-live="polite" data-testid="anchor-fee">
          {rateState === 'loading' && <p>{t('anchor.fee.loading')}</p>}
          {rateState === 'error' && <p>{t('anchor.fee.unavailable')}</p>}
          {rateState === 'idle' && rate && (
            <p>
              <strong>{t('anchor.fee.title')}</strong>{' '}
              {rate.feeTotal
                ? t('anchor.fee.total', { fee: rate.feeTotal, asset: rate.assetCode })
                : rate.feeFixed || rate.feePercent
                  ? t('anchor.fee.breakdown', { fixed: rate.feeFixed ?? '0', percent: rate.feePercent ?? '0' })
                  : null}
              {rate.minAmount && rate.maxAmount ? ` ${t('anchor.fee.limits', { min: rate.minAmount, max: rate.maxAmount })}` : null}
            </p>
          )}
        </div>

        {formError && <p style={{ color: 'crimson' }}>{formError}</p>}

        <button type="submit" disabled={isSubmitting} data-testid="submit-button">
          {isSubmitting ? t('anchor.starting') : kind === 'deposit' ? t('anchor.startDeposit') : t('anchor.startWithdrawal')}
        </button>
      </form>

      <h2 style={{ marginTop: 40 }}>{t('anchor.history')}</h2>
      {isLoadingHistory && <p>{t('common.loading')}</p>}
      {!isLoadingHistory && transactions.length === 0 && <p>{t('anchor.noTransactions')}</p>}
      <ul style={{ listStyle: 'none', padding: 0 }} data-testid="anchor-history">
        {transactions.map((transaction) => (
          <li
            key={transaction.id}
            style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 8 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>
                {transaction.kind === 'deposit' ? t('anchor.deposit') : t('anchor.withdraw')} {transaction.assetCode}
              </strong>
              <button
                type="button"
                onClick={() => void handleRefresh(transaction.id)}
                disabled={refreshingId === transaction.id}
              >
                {refreshingId === transaction.id ? t('anchor.refreshing') : t('anchor.refreshStatus')}
              </button>
            </div>
            <p style={{ margin: '4px 0' }}>{t(`anchor.status.${transaction.status}` as MessageKey)}</p>
            {transaction.amountIn && (
              <p style={{ margin: '4px 0', color: '#666' }}>
                {t('anchor.amountIn', { amount: transaction.amountIn })}
                {transaction.amountOut ? t('anchor.amountOut', { amount: transaction.amountOut }) : ''}
              </p>
            )}
            {transaction.interactiveUrl && SEP24_INCOMPLETE_STATUSES.has(transaction.status) && (
              <a href={transaction.interactiveUrl} target="_blank" rel="noopener noreferrer">
                {t('anchor.continue')}
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
