'use client';

import { paymentStatus, sendPaymentSchema, formatAmount, truncateAddress, type BalanceItem, type TransactionRecord } from '@mixmatch/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getStellarAccount,
  getTransactionHistory,
  sendPayment,
  subscribeToTransactionStream,
} from '../../lib/payments-client';
import { useAuth } from '../../lib/useAuth';
import { getBalances } from '../../lib/wallet-setup-client';

type Tab = 'send' | 'history' | 'receive';
const TABS: { key: Tab; label: string }[] = [
  { key: 'send', label: 'Send' },
  { key: 'history', label: 'History' },
  { key: 'receive', label: 'Receive' },
];

export default function PaymentsPage() {
  const router = useRouter();
  const { accessToken, isLoading, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('send');
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [historyError, setHistoryError] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [balances, setBalances] = useState<BalanceItem[]>([]);
  const [notice, setNotice] = useState('');
  const [streamAvailable, setStreamAvailable] = useState(true);
  const lastStatus = useRef(new Map<string, string>());

  // Destination / amount / memo form state.
  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isLoading && !accessToken) router.push('/login');
  }, [isLoading, accessToken, router]);

  // Tip flow (#1378): the creator page resolves the wallet server-side and
  // pre-fills this form through the query string.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tipDestination = params.get('destination');
    const tipMemo = params.get('memo');
    const tipAmount = params.get('amount');
    if (tipDestination) setDestination(tipDestination);
    if (tipMemo) setMemo(tipMemo);
    if (tipAmount) setAmount(tipAmount);
  }, []);

  const loadHistory = useCallback(async () => {
    if (!accessToken) return;
    setHistoryError(false);
    try {
      const { transactions: rows } = await getTransactionHistory(accessToken);
      rows.forEach((row) => lastStatus.current.set(row.id, row.status));
      setTransactions(rows);
    } catch {
      setHistoryError(true);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!accessToken) return;
    getStellarAccount(accessToken)
      .then((account) => setPublicKey(account.publicKey))
      .catch(() => setPublicKey(null));
    getBalances(accessToken)
      .then((result) => setBalances(result.balances))
      .catch(() => setBalances([]));
  }, [accessToken]);

  // Live updates: one stream per session; announce status changes in the live region.
  useEffect(() => {
    if (!accessToken) return;
    const handle = subscribeToTransactionStream(
      accessToken,
      (transaction) => {
        setStreamAvailable(true);
        const previous = lastStatus.current.get(transaction.id);
        lastStatus.current.set(transaction.id, transaction.status);
        if (previous && previous !== transaction.status) {
          setNotice(`Payment of ${formatAmount(transaction.amount)} XLM: ${paymentStatus(transaction.status).label}`);
        }
        setTransactions((prev) => {
          const index = prev.findIndex((existing) => existing.id === transaction.id);
          if (index === -1) return [transaction, ...prev];
          const next = [...prev];
          next[index] = transaction;
          return next;
        });
      },
      () => setStreamAvailable(false),
    );
    return () => handle.close();
  }, [accessToken]);

  // Fallback: poll while the stream is unavailable.
  useEffect(() => {
    if (streamAvailable || !accessToken) return;
    const interval = setInterval(() => void loadHistory(), 15_000);
    return () => clearInterval(interval);
  }, [streamAvailable, accessToken, loadHistory]);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!accessToken) return;
    const result = sendPaymentSchema.safeParse({
      destinationPublicKey: destination,
      amount,
      memo: memo || undefined,
      idempotencyKey: crypto.randomUUID(),
    });
    if (!result.success) {
      setFormError(result.error.issues[0]?.message ?? 'Invalid input');
      return;
    }
    setIsSending(true);
    try {
      const { transaction } = await sendPayment(result.data, accessToken);
      lastStatus.current.set(transaction.id, transaction.status);
      setTransactions((prev) => [transaction, ...prev.filter((t) => t.id !== transaction.id)]);
      setNotice(`Payment sent: ${paymentStatus(transaction.status).label}`);
      setDestination('');
      setAmount('');
      setMemo('');
      setTab('history');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSending(false);
    }
  };

  const copyAddress = async () => {
    if (!publicKey) return;
    try {
      await navigator.clipboard.writeText(publicKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: 16 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Payments</h1>
        <nav>
          <Link href="/anchor">Deposit / withdraw</Link>{' '}
          <Link href="/wallet">Wallet</Link>{' '}
          <Link href="/profile/edit">Profile</Link>{' '}
          <button type="button" onClick={logout}>Log out</button>
        </nav>
      </header>

      {balances.length ? (
        <div data-testid="balance-strip" style={{ display: 'flex', gap: 12, fontSize: 12, color: '#555' }}>
          {balances.slice(0, 3).map((item) => (
            <span key={`${item.assetCode}:${item.assetIssuer ?? 'native'}`}>{item.assetCode} {item.balance}</span>
          ))}
        </div>
      ) : null}

      <div role="status" aria-live="polite" style={{ minHeight: 24 }}>{notice}</div>

      <div role="tablist" aria-label="Payments" style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`tab-${key}`}
            aria-selected={tab === key}
            aria-controls={`panel-${key}`}
            onClick={() => setTab(key)}
            style={{ fontWeight: tab === key ? 700 : 400 }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'send' && (
        <form id="panel-send" role="tabpanel" aria-labelledby="tab-send" onSubmit={handleSend}>
          <label>
            Destination address
            <input value={destination} onChange={(e) => setDestination(e.target.value)} autoComplete="off" spellCheck={false} />
          </label>
          <label>
            Amount (XLM)
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
          </label>
          <label>
            Memo (optional)
            <input value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={28} />
          </label>
          {formError && <p role="alert">{formError}</p>}
          <button type="submit" disabled={isSending}>{isSending ? 'Sending…' : 'Send'}</button>
        </form>
      )}

      {tab === 'history' && (
        <section id="panel-history" role="tabpanel" aria-labelledby="tab-history">
          {!streamAvailable && <p>Live updates are unavailable; refreshing every 15 seconds.</p>}
          {historyError && (
            <p role="alert">
              Could not load your transactions. <button type="button" onClick={() => void loadHistory()}>Retry</button>
            </p>
          )}
          {!historyError && transactions.length === 0 && <p>No transactions yet.</p>}
          <ul style={{ listStyle: 'none', padding: 0 }} data-testid="payment-history">
            {transactions.map((transaction) => {
              const status = paymentStatus(transaction.status);
              return (
                <li key={transaction.id} style={{ borderBottom: '1px solid #ddd', padding: '8px 0' }}>
                  <strong>{formatAmount(transaction.amount)} XLM</strong>{' '}
                  <span>
                    <span aria-hidden="true">{status.icon}</span> {status.label}
                  </span>
                  <div title={transaction.destinationPublicKey}>To {truncateAddress(transaction.destinationPublicKey)}</div>
                  {transaction.memo ? <div>{transaction.memo}</div> : null}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {tab === 'receive' && (
        <section id="panel-receive" role="tabpanel" aria-labelledby="tab-receive">
          {publicKey ? (
            <>
              <p>Share this address to receive payments:</p>
              <code style={{ wordBreak: 'break-all' }}>{publicKey}</code>
              <div>
                <button type="button" onClick={() => void copyAddress()}>Copy address</button>
                <span role="status" aria-live="polite">{copied ? ' Copied' : ''}</span>
              </div>
            </>
          ) : (
            <p>Loading your address…</p>
          )}
        </section>
      )}
    </main>
  );
}
