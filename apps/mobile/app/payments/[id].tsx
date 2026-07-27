import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { TransactionStatus } from '../../src/components/TransactionStatus';
import { useAuth } from '../../src/context/AuthContext';
import { useTransactionPolling } from '../../src/hooks/use-transaction-polling';

export default function TransactionDetailScreen() {
  const { accessToken } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { transaction, error, isLoading } = useTransactionPolling(id ?? null, accessToken);

  return (
    <View>
      <Text>Transaction status</Text>
      {isLoading && <Text>Loading transaction status…</Text>}
      {error && <Text accessibilityRole="alert">{error}</Text>}
      {transaction && <TransactionStatus transaction={transaction} />}
    </View>
  );
}
