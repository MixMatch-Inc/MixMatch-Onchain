import type { TransactionRecord } from '@mixmatch/shared';
import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useT } from '../i18n-context';
import type { Palette } from '../palette';
import { useTheme } from '../theme-context';

export interface TransactionHistoryListProps {
  transactions: TransactionRecord[];
}

// Status colours that keep enough contrast on both the light and the dark background.
const STATUS_COLOR: Record<'light' | 'dark', Record<TransactionRecord['status'], string>> = {
  light: { PENDING: '#7a4a00', PENDING_SIGNATURE: '#5b3a8f', SUCCESS: '#0b5d1e', FAILED: '#8f1111', NEEDS_REVIEW: '#7a4a00' },
  dark: { PENDING: '#f0c060', PENDING_SIGNATURE: '#c3a6ff', SUCCESS: '#6fdc8c', FAILED: '#ff8a8a', NEEDS_REVIEW: '#f0c060' },
};

function TransactionRow({ transaction }: { transaction: TransactionRecord }) {
  const { t } = useT();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.row} testID={`transaction-${transaction.id}`}>
      <View style={styles.rowHeader}>
        <Text style={styles.amount}>{transaction.amount} XLM</Text>
        <Text style={[styles.status, { color: STATUS_COLOR[isDark ? 'dark' : 'light'][transaction.status] }]}>{transaction.status}</Text>
      </View>
      <Text style={styles.destination} numberOfLines={1}>
        {t('payments.to', { address: transaction.destinationPublicKey })}
      </Text>
      {transaction.memo ? <Text style={styles.memo}>{transaction.memo}</Text> : null}
    </View>
  );
}

export default function TransactionHistoryList({ transactions }: TransactionHistoryListProps) {
  const { t } = useT();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  if (transactions.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>{t('payments.noTransactions')}</Text>
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
