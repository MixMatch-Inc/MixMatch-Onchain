'use client';

import type { SendPaymentInput, TransactionRecord } from '@mixmatch/shared';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AuthShell } from '@/components/AuthShell';
import { PaymentForm } from '@/components/PaymentForm';
import { TransactionHistory } from '@/components/TransactionHistory';
import { useAuth } from '@/lib/auth-context';
import { getTransactionHistory, sendPayment } from '@/lib/payments-client';

const HISTORY_LIMIT = 10;

function PaymentsPageContent() {
  const { user, accessToken } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const loadHistory = useCallback(
    async (targetPage: number) => {
      if (!accessToken) return;
      try {
        const result = await getTransactionHistory({ page: targetPage, limit: HISTORY_LIMIT }, accessToken);
        setTransactions(result.transactions);
        setTotal(result.total);
        setPage(result.page);
        setHistoryError(null);
      } catch (err) {
        setHistoryError(err instanceof Error ? err.message : 'Failed to load transaction history');
      }
    },
    [accessToken],
  );

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    void loadHistory(1);
  }, [user, router, loadHistory]);

  if (!user) {
    return null;
  }

  const handleSend = async (values: SendPaymentInput): Promise<TransactionRecord> => {
    if (!accessToken) {
      throw new Error('You must be signed in to send a payment');
    }
    const { transaction } = await sendPayment(values, accessToken);
    return transaction;
  };

  const handleSuccess = (transaction: TransactionRecord) => {
    router.push(`/payments/${transaction.id}`);
  };

  return (
    <main>
      <h1>Send a payment</h1>
      <PaymentForm onSubmit={handleSend} onSuccess={handleSuccess} />

      <h2>Transaction history</h2>
      {historyError && <p role="alert">{historyError}</p>}
      <TransactionHistory
        transactions={transactions}
        total={total}
        page={page}
        limit={HISTORY_LIMIT}
        onPageChange={loadHistory}
      />

      <p>
        <Link href="/login">&larr; Back</Link>
      </p>
    </main>
  );
}

export default function PaymentsPage() {
  return (
    <AuthShell>
      <PaymentsPageContent />
    </AuthShell>
  );
}
