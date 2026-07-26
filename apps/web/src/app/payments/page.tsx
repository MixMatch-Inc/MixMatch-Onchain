'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { PaymentForm, type PaymentFormValues } from '@/components/PaymentForm';
import { TransactionHistory, type Transaction } from '@/components/TransactionHistory';

const PAYMENTS_PER_PAGE = 10;

export default function PaymentsPage() {
  const { user, accessToken } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTransactions = useCallback(async (page: number) => {
    if (!user || !accessToken) return;

    setIsLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
      const response = await fetch(
        `${API_URL}/api/payments/history?address=${user.id}&limit=${PAYMENTS_PER_PAGE}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setTransactions(data.payments ?? []);
        setTotalPages(Math.max(1, Math.ceil((data.total ?? 0) / PAYMENTS_PER_PAGE)));
      }
    } catch {
      // Silently fail - transactions will show as empty
    } finally {
      setIsLoading(false);
    }
  }, [user, accessToken]);

  useEffect(() => {
    void fetchTransactions(currentPage);
  }, [currentPage, fetchTransactions]);

  const handlePayment = async (values: PaymentFormValues) => {
    if (!accessToken) {
      throw new Error('You must be logged in to send payments');
    }

    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
    const response = await fetch(`${API_URL}/api/payments/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error ?? 'Failed to send payment');
    }

    void fetchTransactions(1);
    setCurrentPage(1);
  };

  if (!user) {
    return (
      <main>
        <h1>Payments</h1>
        <p>Please log in to access payments.</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Payments</h1>
      <PaymentForm onSubmit={handlePayment} />

      {isLoading ? (
        <p>Loading transactions...</p>
      ) : (
        <TransactionHistory
          transactions={transactions}
          totalPages={totalPages}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      )}
    </main>
  );
}
