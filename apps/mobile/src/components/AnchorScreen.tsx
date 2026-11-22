import {
  depositAnchorSchema,
  withdrawAnchorSchema,
  type AnchorTransactionRecord,
} from '@mixmatch/shared';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { depositAnchor, getAnchorHistory, getAnchorStatus, withdrawAnchor } from '../services/anchor-client';

type Kind = 'deposit' | 'withdraw';

// The interactive SEP-24 step (KYC and payment details) happens in the anchor's own web page.
const INTERACTIVE_STATUSES = new Set<AnchorTransactionRecord['status']>(['incomplete', 'pending_user']);

export interface AnchorScreenProps {
  accessToken: string;
  /** Opens a URL in an in-app browser and resolves when the user closes it. Defaults to `expo-web-browser`. */
  openBrowser?: (url: string) => Promise<unknown>;
}

async function defaultOpenBrowser(url: string): Promise<unknown> {
  const WebBrowser = await import('expo-web-browser');
  return WebBrowser.openBrowserAsync(url);
}

function readableStatus(status: string): string {
  const text = status.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function AnchorScreen({ accessToken, openBrowser = defaultOpenBrowser }: AnchorScreenProps) {
  const [kind, setKind] = useState<Kind>('deposit');
  const [assetCode, setAssetCode] = useState('SRT');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactions, setTransactions] = useState<AnchorTransactionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const { transactions: rows } = await getAnchorHistory(accessToken);
      setTransactions(rows);
    } catch {
      setError('Could not load your anchor transactions.');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const refreshOne = useCallback(
    async (id: string) => {
      try {
        const { transaction } = await getAnchorStatus(id, accessToken);
        setTransactions((prev) => prev.map((row) => (row.id === transaction.id ? transaction : row)));
      } catch {
        setError('Could not refresh the status.');
      }
    },
    [accessToken],
  );

  /** Opens the anchor page, then refreshes the transaction once the user comes back. */
  const continueOnAnchor = useCallback(
    async (transaction: AnchorTransactionRecord, url: string) => {
      await openBrowser(url);
      await refreshOne(transaction.id);
    },
    [openBrowser, refreshOne],
  );

  const handleSubmit = async () => {
    setError(null);
    const schema = kind === 'deposit' ? depositAnchorSchema : withdrawAnchorSchema;
    const result = schema.safeParse({ assetCode, amount: amount || undefined });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Invalid input');
      return;
    }
    setIsSubmitting(true);
    try {
      const action = kind === 'deposit' ? depositAnchor : withdrawAnchor;
      const { transaction, interactiveUrl } = await action(result.data, accessToken);
      setTransactions((prev) => [transaction, ...prev]);
      await continueOnAnchor(transaction, interactiveUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.kindRow}>
        {(['deposit', 'withdraw'] as const).map((value) => (
          <TouchableOpacity
            key={value}
            accessibilityRole="button"
            accessibilityState={{ selected: kind === value }}
            onPress={() => setKind(value)}
            style={[styles.kind, kind === value && styles.kindActive]}
          >
            <Text>{value === 'deposit' ? 'Deposit' : 'Withdraw'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput style={styles.input} value={assetCode} onChangeText={setAssetCode} autoCapitalize="characters" placeholder="Asset code" accessibilityLabel="Asset code" />
      <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="Amount (optional)" accessibilityLabel="Amount" />
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <TouchableOpacity accessibilityRole="button" style={styles.submit} onPress={() => void handleSubmit()} disabled={isSubmitting}>
        {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{kind === 'deposit' ? 'Start deposit' : 'Start withdrawal'}</Text>}
      </TouchableOpacity>

      {isLoading ? <ActivityIndicator style={styles.loading} /> : null}
      {!isLoading && transactions.length === 0 ? <Text style={styles.empty}>No anchor transactions yet.</Text> : null}
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        testID="anchor-history"
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowTitle}>
              {item.kind === 'deposit' ? 'Deposit' : 'Withdraw'} {item.assetCode}
            </Text>
            <Text>{readableStatus(item.status)}</Text>
            <View style={styles.rowActions}>
              <TouchableOpacity accessibilityRole="button" onPress={() => void refreshOne(item.id)}>
                <Text style={styles.link}>Refresh status</Text>
              </TouchableOpacity>
              {item.interactiveUrl && INTERACTIVE_STATUSES.has(item.status) ? (
                <TouchableOpacity accessibilityRole="button" onPress={() => void continueOnAnchor(item, item.interactiveUrl as string)}>
                  <Text style={styles.link}>Continue on the anchor</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  kindRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  kind: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#ccc', borderRadius: 8 },
  kindActive: { borderColor: '#000', backgroundColor: '#eee' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 8 },
  error: { color: '#8f1111', marginBottom: 8 },
  submit: { backgroundColor: '#4f46e5', borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 16 },
  submitText: { color: '#fff', fontWeight: '600' },
  loading: { marginTop: 16 },
  empty: { color: '#666', textAlign: 'center', marginTop: 16 },
  row: { borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 10 },
  rowTitle: { fontWeight: '600' },
  rowActions: { flexDirection: 'row', gap: 16, marginTop: 4 },
  link: { color: '#1e3a8a', fontWeight: '600' },
});
