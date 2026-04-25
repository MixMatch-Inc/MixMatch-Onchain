import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  StatusBar,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { JourneyDraft } from '../types';

/**
 * JourneyAuthoringScreen - Mobile shell for draft journey editing
 *
 * Features:
 * - Load/save journey drafts
 * - Slot-based track assignment
 * - Title and metadata editing
 * - Validation and publish readiness
 *
 * Note: Full provider search integration deferred to later phase
 */

const SLOT_COUNT = 7;

interface RouteParams {
  journeyId?: string;
}

export const JourneyAuthoringScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { journeyId } = route.params as RouteParams;
  const token = useAuthStore((s) => s.token);

  const [draft, setDraft] = useState<JourneyDraft>({
    title: '',
    description: '',
    slots: Array.from({ length: SLOT_COUNT }, (_, i) => ({
      index: i,
      trackId: undefined,
      authoredNote: '',
    })),
    version: 0,
  });
  const [isLoading, setIsLoading] = useState(!!journeyId);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; title: string; artist: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Validation
  const filledSlots = draft.slots.filter((s) => s.trackId?.trim());
  const isPublishReady = filledSlots.length > 0 && draft.title.trim().length > 0;
  const isDirty = draft.title.trim().length > 0 || filledSlots.length > 0;

  // Load existing journey
  useEffect(() => {
    if (journeyId) {
      loadJourney(journeyId);
    }
  }, [journeyId]);

  const loadJourney = async (id: string) => {
    if (!token) {
      setError('Authentication required');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`http://localhost:3001/journeys/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load journey');
      }

      const data = await response.json();

      setDraft({
        id: data.id,
        title: data.title || '',
        description: data.description || '',
        slots: data.slots || Array.from({ length: SLOT_COUNT }, (_, i) => ({ index: i, trackId: undefined, authoredNote: '' })),
        version: data.version || 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load journey');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTitleChange = useCallback((text: string) => {
    setDraft((prev) => ({ ...prev, title: text }));
  }, []);

  const handleDescriptionChange = useCallback((text: string) => {
    setDraft((prev) => ({ ...prev, description: text }));
  }, []);

  const handleSlotNoteChange = useCallback((index: number, note: string) => {
    setDraft((prev) => ({
      ...prev,
      slots: prev.slots.map((slot, i) => (i === index ? { ...slot, authoredNote: note } : slot)),
    }));
  }, []);

  const searchTracks = useCallback(async () => {
    if (!searchQuery.trim() || !token) {
      return;
    }

    try {
      setIsSearching(true);
      const response = await fetch(
        `http://localhost:3001/tracks/search?q=${encodeURIComponent(searchQuery)}&limit=10`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setSearchResults(data.items || []);
    } catch (err) {
      Alert.alert('Search Error', err instanceof Error ? err.message : 'Failed to search tracks');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, token]);

  const assignSlot = useCallback(
    (slotIndex: number, track: { id: string; title: string }) => {
      setDraft((prev) => ({
        ...prev,
        slots: prev.slots.map((slot, i) => (i === slotIndex ? { ...slot, trackId: track.id } : slot)),
      }));
      setSearchResults([]);
      setSearchQuery('');
    },
    [],
  );

  const clearSlot = useCallback((slotIndex: number) => {
    setDraft((prev) => ({
      ...prev,
      slots: prev.slots.map((slot, i) => (i === slotIndex ? { ...slot, trackId: undefined, authoredNote: '' } : slot)),
    }));
  }, []);

  const saveDraft = useCallback(async () => {
    if (!token) {
      Alert.alert('Error', 'Authentication required');
      return;
    }

    if (!draft.title.trim()) {
      Alert.alert('Validation Error', 'Journey title is required');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const method = draft.id ? 'PUT' : 'POST';
      const endpoint = draft.id
        ? `http://localhost:3001/journeys/${draft.id}`
        : 'http://localhost:3001/journeys';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: draft.title,
          description: draft.description,
          slots: draft.slots.filter((s) => s.trackId?.trim()),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save journey');
      }

      const data = await response.json();

      setDraft((prev) => ({
        ...prev,
        id: data.id || prev.id,
        version: data.version || 0,
      }));

      Alert.alert('Success', 'Journey saved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save journey');
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save journey');
    } finally {
      setIsSaving(false);
    }
  }, [draft, token]);

  const publishJourney = useCallback(async () => {
    if (!draft.id) {
      Alert.alert('Error', 'Save the journey before publishing');
      return;
    }

    if (!isPublishReady) {
      Alert.alert('Validation Error', 'Add at least one track and a title before publishing');
      return;
    }

    Alert.alert('Publish Journey', 'Are you sure you want to publish this journey?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Publish',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsPublishing(true);
            const response = await fetch(`http://localhost:3001/journeys/${draft.id}/publish`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            if (!response.ok) {
              throw new Error('Failed to publish journey');
            }

            Alert.alert('Published', 'Journey published successfully');
            navigation.goBack();
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to publish journey');
          } finally {
            setIsPublishing(false);
          }
        },
      },
    ]);
  }, [draft.id, isPublishReady, token, navigation]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading journey...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{journeyId ? 'Edit Journey' : 'New Journey'}</Text>
          <TouchableOpacity
            onPress={saveDraft}
            disabled={isSaving || !isDirty}
            style={[styles.saveButton, (isSaving || !isDirty) && styles.saveButtonDisabled]}
          >
            <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save Draft'}</Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Journey Title *</Text>
          <TextInput
            style={styles.titleInput}
            placeholder="Give your journey a name..."
            value={draft.title}
            onChangeText={handleTitleChange}
            maxLength={100}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <TextInput
            style={[styles.titleInput, styles.textArea]}
            placeholder="Optional description of this journey..."
            value={draft.description}
            onChangeText={handleDescriptionChange}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Track Search */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Tracks (max {SLOT_COUNT})</Text>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search for a track..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={searchTracks}
            />
            <TouchableOpacity
              style={styles.searchButton}
              onPress={searchTracks}
              disabled={isSearching || !searchQuery.trim()}
            >
              <Text style={styles.searchButtonText}>{isSearching ? '...' : 'Search'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Search Results</Text>
            {searchResults.map((result) => (
              <TouchableOpacity
                key={result.id}
                style={styles.searchResultItem}
                onPress={() => assignSlot(
                  draft.slots.findIndex((s) => !s.trackId),
                  result
                )}
              >
                <View style={styles.searchResultContent}>
                  <Text style={styles.searchResultTitle}>{result.title}</Text>
                  <Text style={styles.searchResultArtist}>{result.artist}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Slots */}
        <View style={styles.section}>
          <View style={styles.slotsHeader}>
            <Text style={styles.sectionTitle}>Journey Slots ({filledSlots.length}/{SLOT_COUNT})</Text>
          </View>

          <FlatList
            data={draft.slots}
            keyExtractor={(item) => `slot-${item.index}`}
            scrollEnabled={false}
            renderItem={({ item, index }) => (
              <View style={styles.slotCard}>
                <View style={styles.slotHeader}>
                  <Text style={styles.slotNumber}>Slot {item.index + 1}</Text>
                  {item.trackId && (
                    <TouchableOpacity onPress={() => clearSlot(item.index)}>
                      <Text style={styles.clearSlotText}>Clear</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {item.trackId ? (
                  <View style={styles.slotAssigned}>
                    <Text style={styles.slotTrackId}>Track: {item.trackId}</Text>
                  </View>
                ) : (
                  <View style={styles.slotEmpty}>
                    <Text style={styles.slotEmptyText}>Tap "+" in search to assign</Text>
                  </View>
                )}

                <TextInput
                  style={styles.slotNoteInput}
                  placeholder="Author's note for this slot (optional)..."
                  value={item.authoredNote}
                  onChangeText={(text) => handleSlotNoteChange(item.index, text)}
                  multiline
                />
              </View>
            )}
          />
        </View>

        {/* Publish */}
        {draft.id && (
          <View style={styles.publishSection}>
            <TouchableOpacity
              style={[styles.publishButton, !isPublishReady && styles.publishButtonDisabled]}
              onPress={publishJourney}
              disabled={isPublishing || !isPublishReady}
            >
              {isPublishing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.publishButtonText}>Publish Journey</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#64748b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingTop: 8,
  },
  backButton: {
    padding: 4,
  },
  backButtonText: {
    fontSize: 16,
    color: '#0369a1',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  saveButton: {
    backgroundColor: '#0369a1',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  errorBanner: {
    margin: 16,
    padding: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorBannerText: {
    color: '#991b1b',
    fontSize: 14,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  titleInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#0f172a',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#0369a1',
    borderRadius: 8,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  searchResultItem: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  searchResultContent: {
    gap: 4,
  },
  searchResultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  searchResultArtist: {
    fontSize: 13,
    color: '#64748b',
  },
  slotsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  slotCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  slotNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369a1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clearSlotText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600',
  },
  slotAssigned: {
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    marginBottom: 8,
  },
  slotTrackId: {
    fontSize: 14,
    color: '#166534',
    fontWeight: '500',
  },
  slotEmpty: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
  },
  slotEmptyText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
  },
  slotNoteInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#334155',
    textAlignVertical: 'top',
  },
  publishSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  publishButton: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  publishButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  publishButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: 40,
  },
});
