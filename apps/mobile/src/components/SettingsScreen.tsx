import type { LinkedAccount, UserSettings } from '@mixmatch/shared';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { isBiometricAvailable } from '../services/biometrics';
import {
  disconnectLinkedAccount,
  disconnectStreamingConnection,
  getSettings,
  listLinkedAccounts,
  listStreamingConnections,
  startSocialLogin,
  startSpotifyConnect,
  updateSettings,
} from '../services/settings-client';

interface Props {
  onClose: () => void;
}

const CURRENCIES = ['USD', 'EUR', 'NGN'];
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'ar', label: 'العربية' },
];

export default function SettingsScreen({ onClose }: Props) {
  const { accessToken, user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [streamingConnections, setStreamingConnections] = useState<Record<string, any>[]>([]);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [legal, setLegal] = useState<'terms' | 'privacy' | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    void isBiometricAvailable().then(setBiometricAvailable);
    void getSettings(accessToken)
      .then(setSettings)
      .catch(() => setMessage('Could not load settings.'));
    void listLinkedAccounts(accessToken)
      .then(setAccounts)
      .catch(() => setMessage('Could not load linked accounts.'));
    if (user?.id) {
      void listStreamingConnections(String(user.id)).then(setStreamingConnections).catch(() => undefined);
    }
  }, [accessToken]);

  const save = async (next: UserSettings) => {
    if (!accessToken) return;
    setSettings(next);
    try {
      setSettings(await updateSettings(next, accessToken));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not save settings.');
    }
  };

  const linkProvider = async (provider: 'google' | 'apple') => {
    if (!accessToken) return;
    try {
      const result = await startSocialLogin(provider, accessToken);
      if (result.user.id) {
        setAccounts(await listLinkedAccounts(accessToken));
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not link provider.');
    }
  };

  const connectSpotify = async () => {
    if (!user?.id) return;
    try {
      await startSpotifyConnect(String(user.id));
      setStreamingConnections(await listStreamingConnections(String(user.id)));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not connect Spotify.');
    }
  };

  if (!settings) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <TouchableOpacity onPress={onClose} testID="settings-close-button">
          <Text style={styles.link}>Done</Text>
        </TouchableOpacity>
      </View>

      {message ? <Text style={styles.error}>{message}</Text> : null}

      <Text style={styles.section}>Preferences</Text>
      <Text style={styles.label}>Network</Text>
      <View style={styles.row}>
        {(['testnet', 'public'] as const).map((network) => (
          <TouchableOpacity
            key={network}
            style={[styles.chip, settings.network === network ? styles.chipActive : null]}
            onPress={() => void save({ ...settings, network })}
          >
            <Text style={settings.network === network ? styles.chipTextActive : styles.chipText}>{network}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Display currency</Text>
      <View style={styles.row}>
        {CURRENCIES.map((currency) => (
          <TouchableOpacity
            key={currency}
            style={[styles.chip, settings.displayCurrency === currency ? styles.chipActive : null]}
            onPress={() => void save({ ...settings, displayCurrency: currency })}
          >
            <Text style={settings.displayCurrency === currency ? styles.chipTextActive : styles.chipText}>{currency}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Language</Text>
      <View style={styles.row}>
        {LANGUAGES.map((language) => (
          <TouchableOpacity
            key={language.code}
            style={[styles.chip, settings.language === language.code ? styles.chipActive : null]}
            onPress={() => void save({ ...settings, language: language.code })}
          >
            <Text style={settings.language === language.code ? styles.chipTextActive : styles.chipText}>{language.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {(Object.keys(settings.notificationPreferences) as (keyof UserSettings['notificationPreferences'])[]).map((key) => (
        <View style={styles.toggleRow} key={key}>
          <Text style={styles.label}>{key}</Text>
          <Switch
            value={settings.notificationPreferences[key]}
            onValueChange={(value) =>
              void save({
                ...settings,
                notificationPreferences: { ...settings.notificationPreferences, [key]: value },
              })
            }
          />
        </View>
      ))}

      <View style={styles.toggleRow}>
        <Text style={styles.label}>Biometric unlock</Text>
        <Switch
          value={settings.biometricsEnabled}
          disabled={!biometricAvailable}
          onValueChange={(value) => void save({ ...settings, biometricsEnabled: value })}
        />
      </View>
      {!biometricAvailable ? <Text style={styles.hint}>Biometrics are not configured on this device.</Text> : null}

      <Text style={styles.section}>Linked accounts</Text>
      <TouchableOpacity style={styles.button} onPress={() => void linkProvider('google')} testID="link-google-button">
        <Text style={styles.buttonText}>Link Google</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => void linkProvider('apple')} testID="link-apple-button">
        <Text style={styles.buttonText}>Link Apple</Text>
      </TouchableOpacity>
      {accounts.map((account) => (
        <View style={styles.accountRow} key={account.id}>
          <View style={styles.accountInfo}>
            <Text style={styles.accountLabel}>{account.provider}: {account.label}</Text>
            <Text style={styles.hint}>
              Last sync: {account.lastSyncAt ? new Date(account.lastSyncAt).toLocaleString() : 'unknown'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              if (!accessToken) return;
              void disconnectLinkedAccount(account.id, accessToken).then(() =>
                setAccounts((prev) => prev.filter((item) => item.id !== account.id)),
              );
            }}
          >
            <Text style={styles.link}>Disconnect</Text>
          </TouchableOpacity>
        </View>
      ))}

      <Text style={styles.section}>Streaming connections</Text>
      <TouchableOpacity style={styles.button} onPress={() => void connectSpotify()} testID="connect-spotify-button">
        <Text style={styles.buttonText}>Connect Spotify</Text>
      </TouchableOpacity>
      {streamingConnections.map((conn) => (
        <View style={styles.accountRow} key={String(conn.id)}>
          <View style={styles.accountInfo}>
            <Text style={styles.accountLabel}>{String(conn.provider)}: {String(conn.provider_account_id ?? conn.id)}</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              if (!accessToken) return;
              void disconnectStreamingConnection(String(conn.id), accessToken).then(() =>
                setStreamingConnections((prev) => prev.filter((item) => String(item.id) !== String(conn.id))),
              );
            }}
          >
            <Text style={styles.link}>Disconnect</Text>
          </TouchableOpacity>
        </View>
      ))}

      <Text style={styles.section}>Legal</Text>
      <TouchableOpacity onPress={() => setLegal(legal === 'terms' ? null : 'terms')}>
        <Text style={styles.link}>Terms of service</Text>
      </TouchableOpacity>
      {legal === 'terms' ? (
        <Text style={styles.hint}>MixMatch provides a self-custodial payment service. You are responsible for safeguarding your wallet credentials.</Text>
      ) : null}
      <TouchableOpacity onPress={() => setLegal(legal === 'privacy' ? null : 'privacy')}>
        <Text style={styles.link}>Privacy policy</Text>
      </TouchableOpacity>
      {legal === 'privacy' ? (
        <Text style={styles.hint}>MixMatch stores only profile and preference data needed to provide the service.</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700' },
  section: { fontSize: 18, fontWeight: '700', marginTop: 24, marginBottom: 10 },
  label: { fontSize: 14, marginBottom: 6, textTransform: 'capitalize' },
  row: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip: { borderWidth: 1, borderColor: '#ccc', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { backgroundColor: '#000', borderColor: '#000' },
  chipText: { color: '#333' },
  chipTextActive: { color: '#fff' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  button: { backgroundColor: '#000', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginBottom: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
  accountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  accountInfo: { flex: 1, marginRight: 12 },
  accountLabel: { fontWeight: '600' },
  link: { color: '#007AFF' },
  error: { color: '#e00', marginBottom: 12 },
  hint: { color: '#666', fontSize: 12, marginBottom: 12 },
});
