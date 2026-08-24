import type { TransactionRecord } from '@mixmatch/shared';
import { FlatList, StyleSheet, Text, View } from 'react-native';

export interface TransactionHistoryListProps {
  transactions: TransactionRecord[];
}

const STATUS_COLOR: Record<TransactionRecord['status'], string> = {
  PENDING: '#b8860b',
  SUCCESS: '#0a0',
  FAILED: '#e00',
};

function TransactionRow({ transaction }: { transaction: TransactionRecord }) {
  return (
    <View style={styles.row} testID={`transaction-${transaction.id}`}>
      <View style={styles.rowHeader}>
        <Text style={styles.amount}>{transaction.amount} XLM</Text>
        <Text style={[styles.status, { color: STATUS_COLOR[transaction.status] }]}>{transaction.status}</Text>
      </View>
      <Text style={styles.destination} numberOfLines={1}>
        To {transaction.destinationPublicKey}
      </Text>
      {transaction.memo ? <Text style={styles.memo}>{transaction.memo}</Text> : null}
    </View>
  );
}

export default function TransactionHistoryList({ transactions }: TransactionHistoryListProps) {
  if (transactions.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No transactions yet</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={transactions}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <TransactionRow transaction={item} />}
      testID="transaction-history-list"
    />
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  amount: { fontSize: 16, fontWeight: '600' },
  status: { fontSize: 12, fontWeight: '600' },
  destination: { fontSize: 13, color: '#666', marginTop: 2 },
  memo: { fontSize: 13, color: '#999', marginTop: 2 },
  empty: { padding: 24, alignItems: 'center' },
  emptyText: { color: '#999' },
});
