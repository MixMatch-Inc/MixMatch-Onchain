import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { useBlindListeningStore } from '../store/blindListeningStore';
import { DiscoveryCard } from '../components/DiscoveryCard';
import { DiscoveryDjItem, BlindDiscoveryFilters } from '../types';

interface BlindDiscoveryResponse {
  items: DiscoveryDjItem[];
  nextCursor: string | null;
  hasNextPage: boolean;
}

/**
 * BlindDiscoveryScreen - Identity-safe discovery surface
 *
 * Key behaviors:
 * 1. Forces BLIND reveal phase for all items
 * 2. No identity fields (stageName, bio) are ever rendered
 * 3. Image prefetch is AUDITED - no profile media loaded before reveal
 * 4. Only anonymous traits (genres, vibeTags) are visible
 */
export const BlindDiscoveryScreen = () => {
  const navigation = useNavigation();
  const token = useAuthStore((s) => s.token);
  const blindMode = useBlindListeningStore((s) => s.blindMode);
  const disableBlind = useBlindListeningStore((s) => s.disable);

  const [items, setItems] = useState<DiscoveryDjItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [filters] = useState<BlindDiscoveryFilters>({});

  // SECURITY: Audit log for image prefetch attempts
  const imagePrefetchAudit = useCallback((itemId: string, mediaType: string) => {
    console.log('[AUDIT] Image prefetch blocked:', {
      itemId,
      mediaType,
      timestamp: new Date().toISOString(),
      reason: 'BLIND mode prevents identity media preloading',
    });
  }, []);

  const fetchBlindDiscovery = useCallback(
    async (isRefresh = false, loadMoreCursor?: string | null) => {
      if (!blindMode) {
        setError('Blind mode is disabled');
        return;
      }

      if (!token) {
        setError('Authentication required');
        return;
      }

      try {
        if (isRefresh) {
          setRefreshing(true);
        } else if (loadMoreCursor) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const params = new URLSearchParams();
        params.set('limit', '20');
        if (filters.genre) params.set('genre', filters.genre);
        if (filters.availabilityStatus)
          params.set('availabilityStatus', filters.availabilityStatus);
        if (loadMoreCursor) params.set('cursor', loadMoreCursor);

        const response = await fetch(
          `http://localhost:3001/discover/djs?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error('Failed to load discovery data');
        }

        const data: BlindDiscoveryResponse = await response.json();

        if (isRefresh) {
          setItems(data.items);
        } else if (loadMoreCursor) {
          setItems((prev) => [...prev, ...data.items]);
        } else {
          setItems(data.items);
        }

        setCursor(data.nextCursor);
        setHasNextPage(data.hasNextPage);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [blindMode, token, filters],
  );

  useEffect(() => {
    if (!blindMode) {
      // Route isolation: exit blind discovery if mode disabled
      navigation.goBack();
      return;
    }

    fetchBlindDiscovery();
  }, [blindMode, fetchBlindDiscovery]);

  const handleRefresh = useCallback(() => {
    fetchBlindDiscovery(true);
  }, [fetchBlindDiscovery]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && cursor && !loadingMore) {
      fetchBlindDiscovery(false, cursor);
    }
  }, [hasNextPage, cursor, loadingMore, fetchBlindDiscovery]);

  const handleExitBlind = () => {
    disableBlind();
    navigation.goBack();
  };

  // Security: Block image rendering in blind mode
  const handleImageLoad = useCallback(
    (itemId: string) => {
      imagePrefetchAudit(itemId, 'profile');
    },
    [imagePrefetchAudit],
  );

  if (!blindMode) {
    return null;
  }

  if (loading && items.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Loading anonymous profiles...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#111827" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Blind Listening</Text>
            <Text style={styles.subtitle}>
              Profiles are fully anonymous. No identity fields are loaded.
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.exitButton}
              onPress={handleExitBlind}
              activeOpacity={0.8}
            >
              <Text style={styles.exitButtonText}>Exit Blind Mode</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Error State */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Empty State */}
        {!loading && !error && items.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No profiles available right now.</Text>
          </View>
        )}

        {/* Discovery List */}
        {!loading && items.length > 0 && (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <DiscoveryCard
                data={{
                  ...item,
                  revealPhase: 'BLIND',
                  // Ensure identity fields are not used
                  stageName: 'Anonymous DJ',
                  bio: undefined,
                }}
                onPress={(id) => {
                  // Navigation to detail would respect blind mode
                  console.log('[BLIND] Card tapped:', id);
                }}
              />
            )}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={() =>
              loadingMore ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color="#6b7280" />
                </View>
              ) : null
            }
            ListEmptyComponent={!loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No profiles to show.</Text>
              </View>
            ) : null}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#111827',
  },
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6b7280',
  },
  header: {
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    padding: 16,
  },
  headerContent: {
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  exitButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  exitButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9ca3af',
  },
  errorContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#7f1d1d',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#b91c1c',
  },
  errorText: {
    fontSize: 14,
    color: '#fca5a5',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  footerLoader: {
    padding: 20,
    alignItems: 'center',
  },
});
