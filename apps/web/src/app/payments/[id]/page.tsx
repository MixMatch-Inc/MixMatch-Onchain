'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AuthShell } from '@/components/AuthShell';
import { TransactionStatus } from '@/components/TransactionStatus';
import { useAuth } from '@/lib/auth-context';
import { useTransactionPolling } from '@/lib/use-transaction-polling';

function TransactionDetailContent() {
  const { user, accessToken } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const transactionId = params?.id ?? null;

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  const { transaction, error, isLoading } = useTransactionPolling(transactionId, accessToken);

  if (!user) {
    return null;
  }

  return (
    <main>
      <p>
        <Link href="/payments">&larr; Back to payments</Link>
      </p>
      <h1>Transaction status</h1>

      {isLoading && <p>Loading transaction status…</p>}
      {error && <p role="alert">{error}</p>}
      {transaction && <TransactionStatus transaction={transaction} />}
    </main>
  );
}

export default function TransactionDetailPage() {
  return (
    <AuthShell>
      <TransactionDetailContent />
    </AuthShell>
  );
}
