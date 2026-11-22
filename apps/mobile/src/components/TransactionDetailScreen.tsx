import type { TransactionRecord, TransactionTimelineEntry } from '@mixmatch/shared';
import { explorerTransactionUrl } from '@mixmatch/shared';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { getTransactionDetail } from '../services/wallet-client';
import { Amount, StatusPill } from './display';

export interface TransactionDetailScreenProps {
  transactionId: string;
  initialTransaction?: TransactionRecord;
  network?: 'testnet' | 'public';
  onBack: () => void;
}

/** Transaction receipt (#1389): status timeline, hash, explorer link and share. */
export default function TransactionDetailScreen({
  transactionId,
  initialTransaction,
  network = 'testnet',
  onBack,
}: TransactionDetailScreenProps) {
  const { accessToken } = useAuth();
  const [transaction, setTransaction] = useState<TransactionRecord | null>(initialTransaction ?? null);
  const [timeline, setTimeline] = useState<TransactionTimelineEntry[]>([]);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!initialTransaction);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setIsLoading(!initialTransaction);
    setError(false);
    getTransactionDetail(transactionId, accessToken)
      .then((detail) => {
        if (cancelled) return;
        setTransaction(detail.transaction);
        setTimeline(detail.timeline);
        setExplorerUrl(detail.explorer_url ?? explorerTransactionUrl(detail.transaction.stellarTxHash, network));
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, transactionId, network, initialTransaction]);

  const handleShare = async () => {
    if (!transaction) return;
    const message = [
      `MixMatch payment ${transaction.status}`,
      `Amount: ${transaction.amount} ${transaction.assetCode ?? 'XLM'}`,
      transaction.stellarTxHash ? `Hash: ${transaction.stellarTxHash}` : '',
      explorerUrl ?? '',
    ]
      .filter(Boolean)
      .join('\n');
    await Share.share({ message, title: 'Payment receipt' });
  };

  if (isLoading) {
    return <ActivityIndicator style={styles.loading} testID="detail-loading" />;
  }

  if (error || !transaction) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Could not load this receipt.</Text>
        <TouchableOpacity onPress={onBack} testID="detail-back-error">
          <Text style={styles.link}>Back to history</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} testID="transaction-detail">
      <TouchableOpacity onPress={onBack} testID="detail-back">
        <Text style={styles.link}>‹ Back</Text>
      </TouchableOpacity>

      <Text style={styles.heading}>Payment receipt</Text>
      <View style={styles.summary}>
        <Amount style={styles.amount} value={transaction.amount} assetCode={transaction.assetCode ?? 'XLM'} />
        <StatusPill
          tone={transaction.status === 'SUCCESS' ? 'success' : transaction.status === 'FAILED' ? 'danger' : 'info'}
          icon="•"
          label={transaction.status}
        />
      </View>
      <Text style={styles.muted}>To {transaction.destinationPublicKey}</Text>
      {transaction.memo ? <Text style={styles.muted}>Memo: {transaction.memo}</Text> : null}

      <Text style={styles.sectionTitle}>Status timeline</Text>
      {(timeline.length > 0
        ? timeline
        : [{ status: transaction.status, label: transaction.status, at: transaction.updatedAt, description: '' }]
      ).map((entry, index) => (
        <View style={styles.timelineRow} key={`${entry.status}-${index}`} testID={`timeline-${entry.status}`}>
          <View style={styles.dot} />
          <View style={styles.timelineText}>
            <Text style={styles.timelineLabel}>{entry.label}</Text>
            <Text style={styles.muted}>{entry.description}</Text>
            {entry.at ? <Text style={styles.timestamp}>{new Date(entry.at).toLocaleString()}</Text> : null}
          </View>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Transaction hash</Text>
      <Text style={styles.hash} testID="transaction-hash">
        {transaction.stellarTxHash ?? 'Not yet available'}
      </Text>

      {explorerUrl ? (
        <TouchableOpacity
          style={styles.button}
          onPress={() => void Linking.openURL(explorerUrl)}
          testID="explorer-link"
        >
          <Text style={styles.buttonText}>View on Stellar explorer</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity style={styles.buttonSecondary} onPress={() => void handleShare()} testID="share-receipt">
        <Text style={styles.link}>Share receipt</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loading: { marginTop: 40 },
  heading: { fontSize: 20, fontWeight: '700', marginTop: 12 },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  amount: { fontSize: 22, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '600', marginTop: 24, marginBottom: 8 },
  muted: { fontSize: 12, color: '#666', marginTop: 4 },
  timestamp: { fontSize: 11, color: '#999', marginTop: 2 },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4f46e5', marginTop: 4 },
  timelineText: { flex: 1 },
  timelineLabel: { fontWeight: '600' },
  hash: { fontFamily: 'monospace', fontSize: 12, color: '#333' },
  button: { backgroundColor: '#4f46e5', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#fff', fontWeight: '600' },
  buttonSecondary: { alignItems: 'center', padding: 14 },
  link: { color: '#0066cc', fontWeight: '600' },
  error: { color: '#c00', marginBottom: 12 },
});
