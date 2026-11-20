'use client';

import { depositEscrowSchema, truncateAddress } from '@mixmatch/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  createEscrow,
  getEscrow,
  openDispute,
  refundEscrow,
  releaseEscrow,
  type EscrowView,
} from '../../lib/escrow-client';
import { useAuth } from '../../lib/useAuth';

const STORAGE_KEY = 'mixmatch.escrows';
const createInputSchema = depositEscrowSchema.pick({ payeePublicKey: true, tokenContractId: true, amount: true });

function loadIds(): string[] {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

export default function EscrowPage() {
  const router = useRouter();
  const { accessToken, isLoading } = useAuth();
  const [escrows, setEscrows] = useState<EscrowView[]>([]);
  const [payee, setPayee] = useState('');
  const [token, setToken] = useState('');
  const [amount, setAmount] = useState('');
  const [timeoutLedger, setTimeoutLedger] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [disputeFor, setDisputeFor] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');

  useEffect(() => {
    if (!isLoading && !accessToken) router.push('/login');
  }, [isLoading, accessToken, router]);

  // There is no "list my escrows" endpoint, so remember the ids created in this browser and fetch each one.
  const refresh = useCallback(async () => {
    if (!accessToken) return;
    const rows = await Promise.all(loadIds().map((id) => getEscrow(id, accessToken).catch(() => null)));
    setEscrows(rows.filter((row): row is EscrowView => row !== null));
  }, [accessToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const remember = (id: string) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([id, ...loadIds().filter((existing) => existing !== id)]));
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!accessToken) return;
    const parsed = createInputSchema.safeParse({ payeePublicKey: payee, tokenContractId: token, amount });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }
    const ledger = timeoutLedger.trim() === '' ? undefined : Number(timeoutLedger);
    if (ledger !== undefined && (!Number.isInteger(ledger) || ledger <= 0)) {
      setFormError('Timeout ledger must be a positive whole number');
      return;
    }
    setBusy('create');
    try {
      const created = await createEscrow({ ...parsed.data, timeoutLedger: ledger, idempotencyKey: crypto.randomUUID() }, accessToken);
      remember(created.id);
      setEscrows((prev) => [created, ...prev]);
      setMessage(`Escrow created: ${created.status}`);
      setPayee('');
      setToken('');
      setAmount('');
      setTimeoutLedger('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(null);
    }
  };

  const act = async (escrow: EscrowView, action: 'release' | 'refund') => {
    if (!accessToken) return;
    setBusy(escrow.id);
    try {
      const updated = await (action === 'release' ? releaseEscrow : refundEscrow)(escrow.id, accessToken);
      setEscrows((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      setMessage(`Escrow ${action === 'release' ? 'released' : 'refunded'}.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : `Could not ${action} the escrow`);
    } finally {
      setBusy(null);
    }
  };

  const submitDispute = async (escrow: EscrowView) => {
    if (!accessToken || !disputeReason.trim()) return;
    setBusy(escrow.id);
    try {
      await openDispute(escrow.id, disputeReason.trim(), accessToken);
      setEscrows((prev) => prev.map((row) => (row.id === escrow.id ? { ...row, status: 'DISPUTED' } : row)));
      setMessage('Dispute opened. An arbiter will review it.');
      setDisputeFor(null);
      setDisputeReason('');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not open the dispute');
    } finally {
      setBusy(null);
    }
  };

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 16 }}>
      <h1>Escrow</h1>
      <p><Link href="/payments">Back to payments</Link></p>

      <form onSubmit={handleCreate} aria-label="Create escrow">
        <label>Payee address<input value={payee} onChange={(e) => setPayee(e.target.value)} autoComplete="off" spellCheck={false} /></label>
        <label>Token contract id<input value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" spellCheck={false} /></label>
        <label>Amount (smallest unit, e.g. stroops)<input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" /></label>
        <label>Timeout ledger (optional)<input value={timeoutLedger} onChange={(e) => setTimeoutLedger(e.target.value)} inputMode="numeric" /></label>
        {formError && <p role="alert">{formError}</p>}
        <button type="submit" disabled={busy === 'create'}>{busy === 'create' ? 'Creating…' : 'Create escrow'}</button>
      </form>

      <div role="status" aria-live="polite" style={{ minHeight: 24 }}>{message}</div>

      <ul style={{ listStyle: 'none', padding: 0 }} data-testid="escrow-list">
        {escrows.length === 0 && <li>No escrows yet.</li>}
        {escrows.map((escrow) => (
          <li key={escrow.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 8 }}>
            <strong>{escrow.amount}</strong> — {escrow.status}
            <div title={escrow.payeePublicKey}>Payee {truncateAddress(escrow.payeePublicKey, 6, 6)}</div>
            {escrow.finalizeTxHash && <div>Settlement tx: {escrow.finalizeTxHash}</div>}
            {escrow.status === 'LOCKED' && (
              <div style={{ marginTop: 8 }}>
                <button type="button" disabled={busy === escrow.id} onClick={() => void act(escrow, 'release')}>Release to payee</button>{' '}
                <button type="button" disabled={busy === escrow.id} onClick={() => void act(escrow, 'refund')}>Refund to me</button>{' '}
                <button type="button" onClick={() => setDisputeFor(escrow.id)}>Dispute</button>
              </div>
            )}
            {disputeFor === escrow.id && (
              <div style={{ marginTop: 8 }}>
                <label>What went wrong?<textarea value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} maxLength={2000} /></label>
                <button type="button" disabled={busy === escrow.id || !disputeReason.trim()} onClick={() => void submitDispute(escrow)}>Open dispute</button>{' '}
                <button type="button" onClick={() => setDisputeFor(null)}>Cancel</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
