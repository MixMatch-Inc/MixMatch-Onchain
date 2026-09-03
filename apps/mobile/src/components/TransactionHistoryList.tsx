import type { TransactionRecord } from '@mixmatch/shared';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export interface TransactionHistoryListProps {
  transactions: TransactionRecord[];
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

const STATUS_COLOR: Record<TransactionRecord['status'], string> = {
  PENDING: '#b8860b',
  PENDING_SIGNATURE: '#8860b8',
  SUCCESS: '#0a0',
  FAILED: '#e00',
  NEEDS_REVIEW: '#a05a00',
};

function TransactionRow({ transaction }: { transaction: TransactionRecord }) {
  return (
    <View
      style={styles.row}
      testID={`transaction-${transaction.id}`}
      accessibilityRole="summary"
      accessibilityLabel={`${transaction.status} payment of ${transaction.amount} XLM to ${transaction.destinationPublicKey}`}
    >
      <View style={styles.rowHeader}>
        <Text style={styles.amount}>{transaction.amount} XLM</Text>
        <Text
          style={[styles.status, { color: STATUS_COLOR[transaction.status] }]}
        >
          {transaction.status}
        </Text>
      </View>
      <Text style={styles.destination} numberOfLines={1}>
        To {transaction.destinationPublicKey}
      </Text>
      {transaction.memo ? <Text style={styles.memo}>{transaction.memo}</Text> : null}
    </View>
  );
}

export default function TransactionHistoryList({
  transactions,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
}: TransactionHistoryListProps) {
  if (transactions.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No transactions yet</Text>
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.listContent}
      data={transactions}
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={5}
      updateCellsBatchingPeriod={50}
      removeClippedSubviews
      keyExtractor={(item) => item.id}
      onEndReached={hasMore ? onLoadMore : undefined}
      onEndReachedThreshold={0.4}
      renderItem={({ item }) => <TransactionRow transaction={item} />}
      ListFooterComponent={
        hasMore ? (
          <View style={styles.footer}>
            {isLoadingMore ? (
              <ActivityIndicator />
            ) : onLoadMore ? (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={onLoadMore}
                testID="load-more-transactions"
              >
                <Text style={styles.footerText}>Load older transactions</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null
      }
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
  listContent: { paddingBottom: 24 },
  footer: { paddingVertical: 16, alignItems: 'center' },
  footerText: { color: '#007AFF', fontSize: 14, fontWeight: '600' },
});
