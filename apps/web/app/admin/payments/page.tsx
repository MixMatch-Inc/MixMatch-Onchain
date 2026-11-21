'use client';

import { formatAmount, truncateAddress } from '@mixmatch/shared';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { decideHeldPayment, listHeldPayments, type Decision, type HeldPayment } from '../../../lib/admin-client';
import { useAuth } from '../../../lib/useAuth';

interface Pending {
  id: string;
  decision: Decision;
}

export default function AdminPaymentsPage() {
  const router = useRouter();
  const { user, accessToken, isLoading } = useAuth();
  const [items, setItems] = useState<HeldPayment[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Pending | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (!isLoading && !accessToken) router.push('/login');
  }, [isLoading, accessToken, router]);

  const load = useCallback(async () => {
    if (!accessToken || !isAdmin) return;
    setLoadError(null);
    try {
      setItems(await listHeldPayments(accessToken));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load held payments');
    }
  }, [accessToken, isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async ({ id, decision }: Pending) => {
    if (!accessToken) return;
    setBusyId(id);
    setResult(null);
    try {
      await decideHeldPayment(id, decision, accessToken, crypto.randomUUID());
      setItems((prev) => prev.filter((item) => item.id !== id));
      setResult({ ok: true, message: decision === 'approve' ? 'Payment approved.' : 'Payment rejected.' });
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : 'The decision failed' });
    } finally {
      setBusyId(null);
      setConfirming(null);
    }
  };

  if (isLoading) return <main style={{ padding: 16 }}>Loading…</main>;
  if (!isAdmin) return <main style={{ padding: 16 }}><h1>Held payments</h1><p role="alert">This page is for administrators.</p></main>;

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: 16 }}>
      <h1>Held payments</h1>
      <p>High-value payments waiting for an administrator to approve or reject them.</p>

      <div role="status" aria-live="polite">
        {result && <p style={{ color: result.ok ? '#0b5d1e' : '#8f1111' }}>{result.message}</p>}
      </div>
      {loadError && (
        <p role="alert">
          {loadError} <button type="button" onClick={() => void load()}>Retry</button>
        </p>
      )}
      {!loadError && items.length === 0 && <p>No payments are waiting for review.</p>}

      <ul style={{ listStyle: 'none', padding: 0 }} data-testid="held-payments">
        {items.map((item) => {
          const isConfirming = confirming?.id === item.id;
          return (
            <li key={item.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 8 }}>
              <strong>
                {formatAmount(item.amount)} {item.assetCode ?? 'XLM'}
              </strong>
              <div title={item.destinationPublicKey}>To {truncateAddress(item.destinationPublicKey, 6, 6)}</div>
              {item.memo && <div>Memo: {item.memo}</div>}
              <div>Created {new Date(item.createdAt).toLocaleString()}</div>
              {isConfirming && confirming ? (
                <div role="group" aria-label="Confirm decision" style={{ marginTop: 8 }}>
                  <span>{confirming.decision === 'approve' ? 'Approve and send this payment?' : 'Reject this payment?'} </span>
                  <button type="button" disabled={busyId === item.id} onClick={() => void decide(confirming)}>
                    {busyId === item.id ? 'Working…' : 'Confirm'}
                  </button>{' '}
                  <button type="button" disabled={busyId === item.id} onClick={() => setConfirming(null)}>Cancel</button>
                </div>
              ) : (
                <div style={{ marginTop: 8 }}>
                  <button type="button" onClick={() => setConfirming({ id: item.id, decision: 'approve' })}>Approve</button>{' '}
                  <button type="button" onClick={() => setConfirming({ id: item.id, decision: 'reject' })}>Reject</button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
