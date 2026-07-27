import type { SendPaymentInput, TransactionRecord } from '@mixmatch/shared';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Button, ScrollView, Text } from 'react-native';
import { PaymentForm } from '../../src/components/PaymentForm';
import { TransactionHistory } from '../../src/components/TransactionHistory';
import { useAuth } from '../../src/context/AuthContext';
import { getTransactionHistory, sendPayment } from '../../src/services/payments-client';

const HISTORY_LIMIT = 10;

export default function PaymentsScreen() {
  const { accessToken } = useAuth();
  const params = useLocalSearchParams<{ destination?: string; amount?: string; memo?: string }>();
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
    void loadHistory(1);
  }, [loadHistory]);

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
    <ScrollView>
      <Text>Send a payment</Text>
      <PaymentForm onSubmit={handleSend} onSuccess={handleSuccess} initialDestinationPublicKey={params.destination} />

      <Link href="/payments/scan" asChild>
        <Button title="Scan a QR code" onPress={() => {}} />
      </Link>
      <Link href="/payments/receive" asChild>
        <Button title="Receive payment" onPress={() => {}} />
      </Link>

      <Text>Transaction history</Text>
      {historyError && <Text accessibilityRole="alert">{historyError}</Text>}
      <TransactionHistory
        transactions={transactions}
        total={total}
        page={page}
        limit={HISTORY_LIMIT}
        onPageChange={loadHistory}
        onSelect={(transaction) => router.push(`/payments/${transaction.id}`)}
      />
    </ScrollView>
  );
}
