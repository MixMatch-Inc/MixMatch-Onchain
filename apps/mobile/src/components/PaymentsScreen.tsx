import { parsePaymentUri, type PaymentRequest, type TransactionRecord } from '@mixmatch/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import type { BalanceItem, TransactionRecord } from '@mixmatch/shared';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useT } from '../i18n-context';
import { usePaymentLinks } from '../linking';
import type { Palette } from '../palette';
import {
  getStellarAccount,
  getTransactionHistory,
  quotePath,
  sendPayment,
  subscribeToTransactionStream,
} from '../services/payments-client';
import { getBalances } from '../services/wallet-setup-client';
import AnchorScreen from './AnchorScreen';
import MyQrCode from './MyQrCode';
import ProfileEditScreen from './ProfileEditScreen';
import QrScanner from './QrScanner';
import SendPaymentForm from './SendPaymentForm';
import { ErrorState } from './states';
import TransactionHistoryList from './TransactionHistoryList';
import WalletScreen from './WalletScreen';

type Tab = 'send' | 'history' | 'receive' | 'scan' | 'anchor' | 'wallet';

const TABS: { key: Tab; labelKey: 'payments.tab.send' | 'payments.tab.history' | 'payments.tab.receive' | 'payments.tab.scan' }[] = [
  { key: 'send', labelKey: 'payments.tab.send' },
  { key: 'history', labelKey: 'payments.tab.history' },
  { key: 'receive', labelKey: 'payments.tab.receive' },
  { key: 'scan', labelKey: 'payments.tab.scan' },
const TABS: { key: Tab; label: string }[] = [
  { key: 'send', label: 'Send' },
  { key: 'history', label: 'History' },
  { key: 'receive', label: 'Receive' },
  { key: 'scan', label: 'Scan' },
  { key: 'anchor', label: 'Anchor' },
  { key: 'wallet', label: 'Wallet' },
];

export default function PaymentsScreen() {
  const { accessToken, logout } = useAuth();
  const { t } = useT();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [tab, setTab] = useState<Tab>('send');
  const [historyFocused, setHistoryFocused] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | undefined>(undefined);
  // Bumped for every incoming request so the Send form remounts and re-reads its prefill values.
  const [requestNonce, setRequestNonce] = useState(0);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [streamAvailable, setStreamAvailable] = useState(true);
  const [balances, setBalances] = useState<BalanceItem[]>([]);
  const [editingProfile, setEditingProfile] = useState(false);

  const loadAccount = useCallback(async () => {
    if (!accessToken) return;
    const account = await getStellarAccount(accessToken);
    setPublicKey(account.publicKey);
    try {
      const result = await getBalances(accessToken);
      setBalances(result.balances);
    } catch {
      setBalances([]);
    }
  }, [accessToken]);

  const loadHistory = useCallback(async () => {
    if (!accessToken) return;
    setIsLoadingHistory(true);
    setHistoryError(false);
    try {
      const { transactions: rows } = await getTransactionHistory({}, accessToken);
      setTransactions(rows);
    } catch {
      setHistoryError(true);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  useEffect(() => {
    if (historyFocused) {
      void loadHistory();
    }
  }, [historyFocused, loadHistory]);

  // Real-time transaction status: subscribe once per session rather than
  // per tab-visit, so an in-flight payment updates even while the user is
  // elsewhere in the app. Falls back to the existing tab-focus poll above
  // (and a slow background poll below) if the stream can't be opened.
  useEffect(() => {
    if (!accessToken) return;

    const handle = subscribeToTransactionStream(
      accessToken,
      (transaction) => {
        setStreamAvailable(true);
        setTransactions((prev) => {
          const index = prev.findIndex((existing) => existing.id === transaction.id);
          if (index === -1) {
            return [transaction, ...prev];
          }
          const next = [...prev];
          next[index] = transaction;
          return next;
        });
      },
      () => setStreamAvailable(false),
    );

    return () => handle.close();
  }, [accessToken]);

  // Fallback only: re-poll periodically while viewing history if the
  // stream connection isn't available, so status updates still arrive.
  useEffect(() => {
    if (streamAvailable || !historyFocused) return;
    const interval = setInterval(() => void loadHistory(), 15_000);
    return () => clearInterval(interval);
  }, [streamAvailable, tab, loadHistory]);

  const applyRequest = useCallback((request: PaymentRequest) => {
    setPaymentRequest(request);
    setRequestNonce((n) => n + 1);
    setTab('send');
  }, []);

  // Scanned QR: a payment link or, for older codes, a bare public key.
  const handleScanned = (data: string) => applyRequest(parsePaymentUri(data) ?? { destination: data });

  // Links opened from outside the app (mixmatch://pay?..., SEP-7) prefill the Send form the same way.
  usePaymentLinks(applyRequest);
  }, [streamAvailable, historyFocused, loadHistory]);

  if (editingProfile) {
    return <ProfileEditScreen onDone={() => setEditingProfile(false)} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>MixMatch Onchain</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setEditingProfile(true)} testID="edit-profile-button">
            <Text style={styles.logout}>Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={logout} testID="logout-button">
            <Text style={styles.logout}>Log out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {balances.length ? (
        <View style={styles.balanceStrip} testID="balance-strip">
          {balances.slice(0, 3).map((item) => (
            <Text key={`${item.assetCode}:${item.assetIssuer ?? 'native'}`} style={styles.balanceText}>
              {item.assetCode} {item.balance}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={styles.content}>
        {tab === 'send' && accessToken && (
          <SendPaymentForm
            key={requestNonce}
            initialDestination={paymentRequest?.destination}
            initialAmount={paymentRequest?.amount}
            initialMemo={paymentRequest?.memo}
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
              setPaymentRequest(undefined);
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
      <View style={styles.content}>
        <NavigationContainer>
          <Tab.Navigator screenOptions={{ headerShown: false }}>
            <Tab.Screen name="Send">
              {() =>
                accessToken ? (
                  <SendPaymentForm
                    accessToken={accessToken}
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
                ) : null
              }
            </Tab.Screen>
            <Tab.Screen
              name="History"
              listeners={{ focus: () => setHistoryFocused(true), blur: () => setHistoryFocused(false) }}
            >
              {() =>
                isLoadingHistory ? (
                  <ActivityIndicator style={styles.loading} />
                ) : historyError ? (
                  <ErrorState
                    message="Could not load your transactions."
                    action={{ label: 'Retry', onPress: () => void loadHistory() }}
                  />
                ) : (
                  <TransactionHistoryList transactions={transactions} onSelect={setSelectedTransaction} />
                )
              }
            </Tab.Screen>
            <Tab.Screen name="Receive">
              {() => (publicKey ? <MyQrCode publicKey={publicKey} /> : <ActivityIndicator style={styles.loading} />)}
            </Tab.Screen>
            <Tab.Screen name="Scan">
              {({ navigation }) => (
                <QrScanner
                  onScanned={(data) => {
                    setScannedDestination(data);
                    navigation.navigate('Send');
                  }}
                />
              )}
            </Tab.Screen>
            <Tab.Screen name="Wallet">
              {() => (accessToken ? <WalletScreen accessToken={accessToken} /> : null)}
            </Tab.Screen>
          </Tab.Navigator>
        </NavigationContainer>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    title: { fontSize: 18, fontWeight: '700', color: c.text },
    logout: { color: c.link },
    settings: { paddingHorizontal: 16, paddingBottom: 8 },
    tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: c.border },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
    tabActive: { borderBottomWidth: 2, borderBottomColor: c.text },
    tabText: { color: c.textMuted, fontSize: 13 },
    tabTextActive: { color: c.text, fontWeight: '600' },
    content: { flex: 1 },
    loading: { marginTop: 40 },
  });
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
  headerActions: { flexDirection: 'row', gap: 16 },
  balanceStrip: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingBottom: 8 },
  balanceText: { fontSize: 12, color: '#555' },
  content: { flex: 1 },
  loading: { marginTop: 40 },
});
