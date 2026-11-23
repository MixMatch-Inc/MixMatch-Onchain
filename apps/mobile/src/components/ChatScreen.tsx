import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { listMessages, sendMessage, type ChatMessage } from '../services/messages-client';

interface Props {
  otherUserId: string;
}

export default function ChatScreen({ otherUserId }: Props) {
  const { accessToken, user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const rows = await listMessages(otherUserId, accessToken);
      setMessages(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load messages.');
    }
  }, [accessToken, otherUserId]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 3000);
    return () => clearInterval(t);
  }, [load]);

  const onSend = async () => {
    if (!accessToken || !body.trim()) return;
    try {
      const msg = await sendMessage({ recipient_id: otherUserId, body: body.trim() }, accessToken);
      setMessages((prev) => [...prev, msg]);
      setBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send message.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chat</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const mine = item.sender_id === user?.id;
          return (
            <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
              <Text style={styles.body}>{item.body}</Text>
              <Text style={styles.state}>{mine ? item.delivery_state : ''}</Text>
            </View>
          );
        }}
      />
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={body}
          onChangeText={setBody}
          placeholder="Message..."
          placeholderTextColor="#888"
        />
        <TouchableOpacity style={styles.send} onPress={() => void onSend()}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#0b0b0f' },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 12 },
  bubble: { padding: 10, borderRadius: 12, marginVertical: 4, maxWidth: '80%' },
  mine: { alignSelf: 'flex-end', backgroundColor: '#4f46e5' },
  theirs: { alignSelf: 'flex-start', backgroundColor: '#222' },
  body: { color: '#fff' },
  state: { color: '#ddd', fontSize: 10, marginTop: 4 },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  input: { flex: 1, backgroundColor: '#171722', color: '#fff', padding: 12, borderRadius: 10 },
  send: { backgroundColor: '#4f46e5', paddingHorizontal: 16, justifyContent: 'center', borderRadius: 10 },
  sendText: { color: '#fff', fontWeight: '700' },
  error: { color: '#f87171', marginBottom: 8 },
});
