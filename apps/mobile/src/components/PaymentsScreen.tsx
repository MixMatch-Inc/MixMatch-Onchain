import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import type { TransactionRecord } from '@mixmatch/shared';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import {
  getStellarAccount,
  getTransactionHistory,
  quotePath,
  sendPayment,
  subscribeToTransactionStream,
} from '../services/payments-client';
import MyQrCode from './MyQrCode';
import QrScanner from './QrScanner';
import SendPaymentForm from './SendPaymentForm';
import { ErrorState } from './states';
import TransactionHistoryList from './TransactionHistoryList';

const Tab = createBottomTabNavigator();

export default function PaymentsScreen() {
  const { accessToken, logout } = useAuth();
  const [historyFocused, setHistoryFocused] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [scannedDestination, setScannedDestination] = useState<string | undefined>(undefined);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [streamAvailable, setStreamAvailable] = useState(true);

  const loadAccount = useCallback(async () => {
    if (!accessToken) return;
    const account = await getStellarAccount(accessToken);
    setPublicKey(account.publicKey);
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
  }, [streamAvailable, historyFocused, loadHistory]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>MixMatch Onchain</Text>
        <TouchableOpacity onPress={logout} testID="logout-button">
          <Text style={styles.logout}>Log out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <NavigationContainer>
          <Tab.Navigator screenOptions={{ headerShown: false }}>
            <Tab.Screen name="Send">
              {() =>
                accessToken ? (
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
                  <TransactionHistoryList transactions={transactions} />
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
          </Tab.Navigator>
        </NavigationContainer>
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
  content: { flex: 1 },
  loading: { marginTop: 40 },
});
