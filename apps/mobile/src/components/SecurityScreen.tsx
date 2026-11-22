import type { NotificationPreferences } from '@mixmatch/shared';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Share } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import {
  changePassword,
  exportTransactions,
  getNotificationPreferences,
  sendVerificationEmail,
  updateNotificationPreferences,
} from '../services/security-client';

export default function SecurityScreen({ onDone }: { onDone: () => void }) {
  const { accessToken } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [prefs, setPrefs] = useState<NotificationPreferences>({ payments: true, matches: true, marketing: false });
  const [message, setMessage] = useState<string | null>(null);

  const requireToken = (): string | null => {
    if (!accessToken) setMessage('Please sign in first.');
    return accessToken;
  };

  const change = async () => {
    const token = requireToken();
    if (!token) return;
    try {
      setMessage(await changePassword({ currentPassword, newPassword }, token));
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not change password');
    }
  };

  const exportCsv = async () => {
    const token = requireToken();
    if (!token) return;
    try {
      const result = await exportTransactions('csv', token);
      await Share.share({ message: result.content, title: result.fileName });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not export transactions');
    }
  };

  const loadPrefs = async () => {
    const token = requireToken();
    if (!token) return;
    try {
      setPrefs(await getNotificationPreferences(token));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not load preferences');
    }
  };

  const toggle = async (key: keyof NotificationPreferences) => {
    const token = requireToken();
    if (!token) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    try {
      setPrefs(await updateNotificationPreferences(next, token));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not save preferences');
    }
  };

  return (
    <ScrollView style={styles.container} testID="security-screen">
      <Text style={styles.heading}>Security & notifications</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}

      <Text style={styles.label}>Change password</Text>
      <TextInput style={styles.input} placeholder="Current password" secureTextEntry value={currentPassword} onChangeText={setCurrentPassword} testID="current-password-input" />
      <TextInput style={styles.input} placeholder="New password" secureTextEntry value={newPassword} onChangeText={setNewPassword} testID="new-password-input" />
      <TouchableOpacity style={styles.button} onPress={() => void change()} testID="change-password-button">
        <Text style={styles.buttonText}>Change password</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.buttonSecondary} onPress={() => {
        const token = requireToken();
        if (token) void sendVerificationEmail(token).then(setMessage);
      }}>
        <Text style={styles.link}>Send verification email</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Notifications</Text>
      <TouchableOpacity onPress={() => void loadPrefs()}>
        <Text style={styles.link}>Load preferences</Text>
      </TouchableOpacity>
      {(Object.keys(prefs) as (keyof NotificationPreferences)[]).map((key) => (
        <TouchableOpacity key={key} style={styles.row} onPress={() => void toggle(key)} testID={`pref-${key}`}>
          <Text>{key}</Text>
          <Text>{prefs[key] ? 'On' : 'Off'}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.buttonSecondary} onPress={() => void exportCsv()} testID="export-csv-button">
        <Text style={styles.link}>Export history (CSV)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.buttonSecondary} onPress={onDone}>
        <Text style={styles.link}>Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  label: { fontWeight: '600', marginTop: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginTop: 8 },
  button: { backgroundColor: '#4f46e5', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#fff', fontWeight: '600' },
  buttonSecondary: { padding: 14, alignItems: 'center' },
  link: { color: '#0066cc', fontWeight: '600' },
  message: { color: '#444', background: '#f3f4f6', padding: 10, borderRadius: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
});
