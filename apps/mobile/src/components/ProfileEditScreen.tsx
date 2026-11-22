import type { AuthUser } from '@mixmatch/shared';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { updateProfile, uploadAvatar } from '../services/wallet-setup-client';

export default function ProfileEditScreen({ onDone }: { onDone: () => void }) {
  const { user, accessToken } = useAuth();
  const profile = user as (AuthUser & { displayName?: string | null; bio?: string | null; avatarUrl?: string | null }) | null;
  const [displayName, setDisplayName] = useState(profile?.displayName ?? profile?.email.split('@')[0] ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [avatarSource, setAvatarSource] = useState(profile?.avatarUrl ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!accessToken) return;
    if (!displayName.trim()) {
      setError('Display name is required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let avatarUrl: string | null = avatarSource.trim() || null;
      if (avatarSource.startsWith('data:')) {
        const marker = avatarSource.indexOf(';base64,');
        if (marker === -1) throw new Error('Data URLs must include ;base64,');
        const contentType = avatarSource.slice(5, marker);
        const data = avatarSource.slice(marker + ';base64,'.length);
        const result = await uploadAvatar(data, contentType, accessToken);
        avatarUrl = result.avatarUrl;
      }
      await updateProfile({ displayName: displayName.trim(), bio: bio.trim() || undefined, avatarUrl }, accessToken);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.container} testID="profile-edit-screen">
      <Text style={styles.heading}>Edit profile</Text>
      {error ? <Text style={styles.error} role="alert">{error}</Text> : null}

      <Text style={styles.label}>Avatar URL or image data URL</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={avatarSource}
        onChangeText={setAvatarSource}
        placeholder="https://… or data:image/png;base64,…"
        autoCapitalize="none"
        testID="avatar-input"
      />

      <Text style={styles.label}>Display name</Text>
      <TextInput
        style={styles.input}
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Your name"
        maxLength={255}
        testID="display-name-input"
      />

      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={bio}
        onChangeText={setBio}
        placeholder="Tell listeners about your sound"
        maxLength={2000}
        multiline
        testID="bio-input"
      />

      <TouchableOpacity style={styles.button} onPress={() => void save()} disabled={busy} testID="save-profile-button">
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save profile</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  label: { fontWeight: '600', marginTop: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  button: { backgroundColor: '#4f46e5', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 24 },
  buttonText: { color: '#fff', fontWeight: '600' },
  error: { color: '#c00', marginBottom: 8 },
});
