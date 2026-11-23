import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { getDeck, postSwipe, type DeckCard } from '../services/swipes-client';

export default function SwipeDeckScreen() {
  const { accessToken } = useAuth();
  const [cards, setCards] = useState<DeckCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const position = useRef(new Animated.ValueXY()).current;

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await getDeck(accessToken, 20);
      setCards(res.deck);
      setMessage(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not load deck.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const advance = useCallback(() => {
    setCards((prev) => prev.slice(1));
    position.setValue({ x: 0, y: 0 });
  }, [position]);

  const swipe = useCallback(
    async (direction: 'like' | 'pass') => {
      const card = cards[0];
      if (!card || !accessToken) return;
      try {
        Vibration.vibrate(10);
      } catch {}
      const x = direction === 'like' ? 500 : -500;
      Animated.timing(position, { toValue: { x, y: 0 }, duration: 180, useNativeDriver: false }).start(async () => {
        try {
          await postSwipe({ swiped_id: card.user_id, direction }, accessToken);
        } catch (err) {
          setMessage(err instanceof Error ? err.message : 'Swipe failed.');
        } finally {
          advance();
        }
      });
    },
    [accessToken, advance, cards, position],
  );

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8,
      onPanResponderMove: Animated.event([null, { dx: position.x, dy: position.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, g) => {
        if (g.dx > 120) {
          void swipe('like');
        } else if (g.dx < -120) {
          void swipe('pass');
        } else {
          Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        }
      },
    }),
  ).current;

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading deck...</Text>
      </View>
    );
  }

  const top = cards[0];
  if (!top) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No more cards</Text>
        <Text style={styles.muted}>Check back later for new matches.</Text>
        {message ? <Text style={styles.error}>{message}</Text> : null}
        <TouchableOpacity style={styles.reloadBtn} onPress={() => void load()}>
          <Text style={styles.reloadText}>Reload</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const rotate = position.x.interpolate({ inputRange: [-300, 0, 300], outputRange: ['-12deg', '0deg', '12deg'] });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Discover</Text>
      {message ? <Text style={styles.error}>{message}</Text> : null}
      <View style={styles.deckArea}>
        <Animated.View
          style={[styles.card, { transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }] }]}
          {...responder.panHandlers}
        >
          <Text style={styles.name}>{top.display_name}</Text>
          <Text style={styles.meta}>Artists: {(top.top_artists || []).slice(0, 3).join(', ') || '—'}</Text>
          <Text style={styles.meta}>Genres: {(top.top_genres || []).slice(0, 3).join(', ') || '—'}</Text>
        </Animated.View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, styles.passBtn]} onPress={() => void swipe('pass')} testID="swipe-pass">
          <Text style={styles.actionText}>Pass</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.likeBtn]} onPress={() => void swipe('like')} testID="swipe-like">
          <Text style={styles.actionText}>Like</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#0b0b0f' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#0b0b0f' },
  title: { color: '#fff', fontSize: 28, fontWeight: '700', marginBottom: 16 },
  deckArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    width: '100%',
    minHeight: 320,
    borderRadius: 20,
    backgroundColor: '#171722',
    padding: 24,
    justifyContent: 'flex-end',
  },
  name: { color: '#fff', fontSize: 28, fontWeight: '700', marginBottom: 8 },
  meta: { color: '#bbb', fontSize: 14, marginTop: 4 },
  actions: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 20 },
  actionBtn: { paddingVertical: 14, paddingHorizontal: 28, borderRadius: 999 },
  passBtn: { backgroundColor: '#333' },
  likeBtn: { backgroundColor: '#4f46e5' },
  actionText: { color: '#fff', fontWeight: '700' },
  emptyTitle: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  muted: { color: '#999', fontSize: 14, textAlign: 'center' },
  error: { color: '#f87171', marginTop: 8 },
  reloadBtn: { marginTop: 16, backgroundColor: '#4f46e5', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  reloadText: { color: '#fff', fontWeight: '600' },
});
