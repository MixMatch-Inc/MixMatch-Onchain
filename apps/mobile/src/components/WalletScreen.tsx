import type { BalancesResponse } from '@mixmatch/shared';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { createWallet, fundWallet, getBalances, getWalletAccount } from '../services/wallet-setup-client';

export default function WalletScreen({ accessToken }: { accessToken: string }) {
  const [account, setAccount] = useState<{ publicKey: string; network: string } | null>(null);
  const [balances, setBalances] = useState<BalancesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [funded, setFunded] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const wallet = await getWalletAccount(accessToken);
      setAccount(wallet);
      setBalances(await getBalances(accessToken));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load wallet');
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    setBusy(true);
    setError(null);
    try {
      const wallet = await createWallet(accessToken);
      setAccount(wallet);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create wallet');
    } finally {
      setBusy(false);
    }
  };

  const handleFund = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await fundWallet(accessToken);
      setFunded(result.funded);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not fund wallet');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.container} testID="wallet-screen">
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Your wallet</Text>
        <View style={[styles.badge, account?.network === 'public' ? styles.publicBadge : styles.testBadge]} testID="network-badge">
          <Text style={styles.badgeText}>{account?.network ?? 'testnet'}</Text>
        </View>
      </View>

      {error ? <Text style={styles.error} role="alert">{error}</Text> : null}
      {!account && !error ? <ActivityIndicator style={styles.loading} /> : null}

      {account ? (
        <View style={styles.card}>
          <Text style={styles.label}>Public address</Text>
          <Text style={styles.address} testID="wallet-address">{account.publicKey}</Text>
        </View>
      ) : null}

      {!account && !error ? (
        <TouchableOpacity style={styles.button} onPress={() => void handleCreate()} disabled={busy} testID="create-wallet-button">
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create wallet</Text>}
        </TouchableOpacity>
      ) : null}

      {account?.network === 'testnet' ? (
        <TouchableOpacity style={styles.buttonSecondary} onPress={() => void handleFund()} disabled={busy} testID="fund-wallet-button">
          <Text style={styles.link}>{funded ? 'Funded — fund again' : 'Fund with Friendbot (testnet)'}</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.muted}>Funding is unavailable on the public network.</Text>
      )}

      <Text style={styles.sectionTitle}>Balances</Text>
      {!balances ? <ActivityIndicator /> : null}
      {balances?.balances.map((item) => (
        <View style={styles.balanceRow} key={`${item.assetCode}:${item.assetIssuer ?? 'native'}`} testID={`balance-${item.assetCode}`}>
          <Text style={styles.balanceAsset}>{item.assetCode}</Text>
          <Text style={styles.balanceAmount}>{item.balance}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { fontSize: 20, fontWeight: '700' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  testBadge: { backgroundColor: '#fef3c7' },
  publicBadge: { backgroundColor: '#dcfce7' },
  badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  card: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginTop: 16 },
  label: { fontSize: 12, color: '#666' },
  address: { fontFamily: 'monospace', fontSize: 12, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 24, marginBottom: 8 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  balanceAsset: { fontWeight: '600' },
  balanceAmount: { fontVariant: ['tabular-nums'] },
  button: { backgroundColor: '#4f46e5', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#fff', fontWeight: '600' },
  buttonSecondary: { alignItems: 'center', padding: 16 },
  link: { color: '#0066cc', fontWeight: '600' },
  muted: { color: '#666', marginTop: 12 },
  error: { color: '#c00', marginTop: 12 },
  loading: { marginTop: 16 },
});
