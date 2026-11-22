import type { TransactionRecord } from '@mixmatch/shared';
import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useT } from '../i18n-context';
import type { Palette } from '../palette';
import { useTheme } from '../theme-context';
import { paymentStatus, type TransactionRecord } from '@mixmatch/shared';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Address, Amount, StatusPill } from './display';
import { EmptyState } from './states';

export interface TransactionHistoryListProps {
  transactions: TransactionRecord[];
  /** Opens the receipt screen (#1389). */
  onSelect?: (transaction: TransactionRecord) => void;
}

function TransactionRow({ transaction, onSelect }: { transaction: TransactionRecord; onSelect?: (transaction: TransactionRecord) => void }) {
  return (
    <Pressable
      style={styles.row}
      testID={`transaction-${transaction.id}`}
      onPress={() => onSelect?.(transaction)}
      accessibilityRole="button"
      accessibilityLabel={`Open receipt for payment ${transaction.id}`}
      disabled={!onSelect}
    >
      <View style={styles.rowHeader}>
        <Amount style={styles.amount} value={transaction.amount} assetCode={transaction.assetCode ?? 'XLM'} />
        <StatusPill {...paymentStatus(transaction.status)} />
      </View>
      <Text style={styles.destination} numberOfLines={1}>
        To <Address value={transaction.destinationPublicKey} />
      </Text>
      {transaction.memo ? <Text style={styles.memo}>{transaction.memo}</Text> : null}
    </Pressable>
  );
}

export default function TransactionHistoryList({ transactions, onSelect }: TransactionHistoryListProps) {
  if (transactions.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>{t('payments.noTransactions')}</Text>
      </View>
    );
    return <EmptyState message="No transactions yet" />;
  }

  return (
    <FlatList
      data={transactions}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <TransactionRow transaction={item} onSelect={onSelect} />}
      testID="transaction-history-list"
    />
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    row: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: c.border },
    rowHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    amount: { fontSize: 16, fontWeight: '600', color: c.text },
    status: { fontSize: 12, fontWeight: '600' },
    destination: { fontSize: 13, color: c.textMuted, marginTop: 2 },
    memo: { fontSize: 13, color: c.textMuted, marginTop: 2 },
    empty: { padding: 24, alignItems: 'center' },
    emptyText: { color: c.textMuted },
  });
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
