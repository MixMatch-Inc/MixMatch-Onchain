import type { TransactionRecord } from '@mixmatch/shared';
import { Button, FlatList, Text, View } from 'react-native';

export interface TransactionHistoryProps {
  transactions: TransactionRecord[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onSelect: (transaction: TransactionRecord) => void;
}

export function TransactionHistory({
  transactions,
  total,
  page,
  limit,
  onPageChange,
  onSelect,
}: TransactionHistoryProps) {
  if (transactions.length === 0) {
    return <Text>No transactions yet.</Text>;
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <View accessibilityLabel="Transaction history">
      <FlatList
        data={transactions}
        keyExtractor={(transaction) => transaction.id}
        renderItem={({ item: transaction }) => (
          <View testID={`transaction-row-${transaction.id}`}>
            <Text>{new Date(transaction.createdAt).toLocaleString()}</Text>
            <Text>{transaction.destinationPublicKey}</Text>
            <Text>{transaction.amount} XLM</Text>
            <Text>{transaction.status}</Text>
            <Button title="View" onPress={() => onSelect(transaction)} />
          </View>
        )}
      />

      {totalPages > 1 && (
        <View accessibilityLabel="Pagination">
          <Button title="Previous" onPress={() => onPageChange(page - 1)} disabled={page <= 1} />
          <Text>
            Page {page} of {totalPages}
          </Text>
          <Button title="Next" onPress={() => onPageChange(page + 1)} disabled={page >= totalPages} />
        </View>
      )}
    </View>
  );
}
