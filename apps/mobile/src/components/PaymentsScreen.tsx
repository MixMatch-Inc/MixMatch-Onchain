import type { TransactionRecord } from '@mixmatch/shared';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import {
  getStellarAccount,
  getTransactionHistory,
  quotePath,
  sendPayment,
} from '../services/payments-client';
import MyQrCode from './MyQrCode';
import QrScanner from './QrScanner';
import SendPaymentForm from './SendPaymentForm';
import TransactionHistoryList from './TransactionHistoryList';

type Tab = 'send' | 'history' | 'receive' | 'scan';

const TABS: { key: Tab; label: string }[] = [
  { key: 'send', label: 'Send' },
  { key: 'history', label: 'History' },
  { key: 'receive', label: 'Receive' },
  { key: 'scan', label: 'Scan' },
];

export default function PaymentsScreen() {
  const { accessToken, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('send');
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [scannedDestination, setScannedDestination] = useState<string | undefined>(undefined);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const loadAccount = useCallback(async () => {
    if (!accessToken) return;
    const account = await getStellarAccount(accessToken);
    setPublicKey(account.publicKey);
  }, [accessToken]);

  const loadHistory = useCallback(async () => {
    if (!accessToken) return;
    setIsLoadingHistory(true);
    try {
      const { transactions: rows } = await getTransactionHistory({}, accessToken);
      setTransactions(rows);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  useEffect(() => {
    if (tab === 'history') {
      void loadHistory();
    }
  }, [tab, loadHistory]);

  const handleScanned = (data: string) => {
    setScannedDestination(data);
    setTab('send');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>MixMatch Onchain</Text>
        <TouchableOpacity onPress={logout} testID="logout-button">
          <Text style={styles.logout}>Log out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {TABS.map(({ key, label }) => (
          <TouchableOpacity key={key} onPress={() => setTab(key)} style={[styles.tab, tab === key && styles.tabActive]}>
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.content}>
        {tab === 'send' && accessToken && (
          <SendPaymentForm
            initialDestination={scannedDestination}
            onSubmit={async (values) => {
              const { transaction } = await sendPayment(values, accessToken);
              return transaction;
            }}
            onQuote={(params) =>
              quotePath(
                {
                  source: { assetCode: params.sourceAssetCode, assetIssuer: params.sourceAssetIssuer },
                  dest: { assetCode: params.destAssetCode, assetIssuer: params.destAssetIssuer },
                  amount: params.amount,
                  mode: 'strictSend',
                },
                accessToken,
              )
            }
            onSuccess={() => {
              setScannedDestination(undefined);
              void loadHistory();
            }}
          />
        )}

        {tab === 'history' &&
          (isLoadingHistory ? (
            <ActivityIndicator style={styles.loading} />
          ) : (
            <TransactionHistoryList transactions={transactions} />
          ))}

        {tab === 'receive' && (publicKey ? <MyQrCode publicKey={publicKey} /> : <ActivityIndicator style={styles.loading} />)}

        {tab === 'scan' && <QrScanner onScanned={handleScanned} />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 18, fontWeight: '700' },
  logout: { color: '#007AFF' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#000' },
  tabText: { color: '#999', fontSize: 13 },
  tabTextActive: { color: '#000', fontWeight: '600' },
  content: { flex: 1 },
  loading: { marginTop: 40 },
});
