import type { TransactionRecord } from '@mixmatch/shared';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface TransactionHistoryListProps {
  transactions: TransactionRecord[];
  /** Whether a "load more" fetch is currently in progress. */
  isLoadingMore?: boolean;
  /** Whether there are more pages to load. */
  hasMore?: boolean;
  /** Called when the user requests the next page. */
  onLoadMore?: () => void;
}

const STATUS_COLOR: Record<TransactionRecord['status'], string> = {
  PENDING: '#b8860b',
  PENDING_SIGNATURE: '#8860b8',
  SUCCESS: '#0a0',
  FAILED: '#e00',
  NEEDS_REVIEW: '#a05a00',
};

const ROW_HEIGHT = 80;

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

export default function TransactionHistoryList({
  transactions,
  isLoadingMore,
  hasMore,
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
      data={transactions}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <TransactionRow transaction={item} />}
      testID="transaction-history-list"
      // Performance tuning for longer histories (#981)
      getItemLayout={(_data, index) => ({
        length: ROW_HEIGHT,
        offset: ROW_HEIGHT * index,
        index,
      })}
      windowSize={10}
      initialNumToRender={15}
      maxToRenderPerBatch={10}
      removeClippedSubviews
      // Pagination: load more when reaching the end (#980)
      onEndReached={hasMore && onLoadMore ? onLoadMore : undefined}
      onEndReachedThreshold={0.3}
      ListFooterComponent={
        isLoadingMore ? (
          <ActivityIndicator style={styles.loadingMore} />
        ) : hasMore && onLoadMore ? (
          <TouchableOpacity
            onPress={onLoadMore}
            style={styles.loadMoreButton}
            testID="load-more-button"
            accessibilityRole="button"
            accessibilityLabel="Load more transactions"
          >
            <Text style={styles.loadMoreText}>Load more</Text>
          </TouchableOpacity>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  row: {
    height: ROW_HEIGHT,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    justifyContent: 'center',
  },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  amount: { fontSize: 16, fontWeight: '600' },
  status: { fontSize: 12, fontWeight: '600' },
  destination: { fontSize: 13, color: '#666', marginTop: 2 },
  memo: { fontSize: 13, color: '#999', marginTop: 2 },
  empty: { padding: 24, alignItems: 'center' },
  emptyText: { color: '#999' },
  loadingMore: { paddingVertical: 16 },
  loadMoreButton: { paddingVertical: 14, alignItems: 'center' },
  loadMoreText: { color: '#0066cc', fontSize: 14 },
});
