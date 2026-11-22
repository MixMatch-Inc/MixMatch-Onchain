import type { AuthUser } from '@mixmatch/shared';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { authHeaders, request } from '../services/api-client';

type Raw = Record<string, unknown>;

/** Read-only profile screen backed by GET /api/users/me (#1381). */
export default function ProfileScreen({ accessToken }: { accessToken: string }) {
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    request<Raw>('/api/users/me', { headers: authHeaders(accessToken) })
      .then((row) => {
        if (cancelled) return;
        setProfile({
          id: String(row.id),
          email: String(row.email),
          role: String(row.role) as AuthUser['role'],
          displayName: row.display_name ? String(row.display_name) : undefined,
          avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
          bio: row.bio ? String(row.bio) : null,
          createdAt: String(row.created_at ?? ''),
          updatedAt: String(row.updated_at ?? ''),
        });
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  return (
    <ScrollView style={styles.container} testID="profile-screen">
      <Text style={styles.heading}>Your profile</Text>
      {error ? <Text style={styles.error}>Could not load your profile.</Text> : null}
      {!error && !profile ? <Text>Loading…</Text> : null}
      {profile ? (
        <View style={styles.card}>
          <Text style={styles.name}>{profile.displayName ?? profile.email}</Text>
          <Text style={styles.muted}>{profile.email}</Text>
          <Text style={styles.bio}>{profile.bio ?? 'No bio yet.'}</Text>
          <Text style={styles.muted}>Role: {profile.role}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  card: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 16, gap: 6 },
  name: { fontSize: 17, fontWeight: '600' },
  muted: { color: '#666', fontSize: 13 },
  bio: { marginVertical: 8 },
  error: { color: '#c00' },
});
