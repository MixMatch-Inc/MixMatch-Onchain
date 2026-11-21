import { paymentStatus, type TransactionRecord } from '@mixmatch/shared';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Address, Amount, StatusPill } from './display';
import { EmptyState } from './states';

export interface TransactionHistoryListProps {
  transactions: TransactionRecord[];
}

function TransactionRow({ transaction }: { transaction: TransactionRecord }) {
  return (
    <View style={styles.row} testID={`transaction-${transaction.id}`}>
      <View style={styles.rowHeader}>
        <Amount style={styles.amount} value={transaction.amount} assetCode="XLM" />
        <StatusPill {...paymentStatus(transaction.status)} />
      </View>
      <Text style={styles.destination} numberOfLines={1}>
        To <Address value={transaction.destinationPublicKey} />
      </Text>
      {transaction.memo ? <Text style={styles.memo}>{transaction.memo}</Text> : null}
    </View>
  );
}

export default function TransactionHistoryList({ transactions }: TransactionHistoryListProps) {
  if (transactions.length === 0) {
    return <EmptyState message="No transactions yet" />;
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
  destination: { fontSize: 13, color: '#666', marginTop: 2 },
  memo: { fontSize: 13, color: '#999', marginTop: 2 },
});
