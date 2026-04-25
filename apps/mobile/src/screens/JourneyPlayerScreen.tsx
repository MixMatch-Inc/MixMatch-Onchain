import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { JourneyPlayerMachine } from '../lib/journey-player';
import { PlayerState, TrackState } from '@mixmatch/types';
import { RootStackParamList } from '../navigation/AppNavigator';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'JourneyPlayer'>;
type RouteProp = { journeyId: string };

export const JourneyPlayerScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { journeyId } = route.params as RouteProp;
  const token = useAuthStore((s) => s.token);

  const [player, setPlayer] = useState<JourneyPlayerMachine | null>(null);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  // Initialize player
  useEffect(() => {
    const p = new JourneyPlayerMachine(journeyId, ['track_1', 'track_2', 'track_3'], 30000);
    setPlayer(p);
    setSnapshot(p.getSnapshot());
    setLoading(false);
  }, [journeyId]);

  // Subscribe to state updates
  useEffect(() => {
    if (!player) return;

    const interval = setInterval(() => {
      setSnapshot({ ...player.getSnapshot() });
    }, 100);

    return () => clearInterval(interval);
  }, [player]);

  const handleStart = useCallback(() => {
    if (!player) return;
    player.start();
    setIsPlaying(true);
    setSnapshot(player.getSnapshot());
  }, [player]);

  const handlePause = useCallback(() => {
    if (!player) return;
    player.pause();
    setIsPlaying(false);
    setSnapshot(player.getSnapshot());
  }, [player]);

  const handleResume = useCallback(() => {
    if (!player) return;
    player.resume();
    setIsPlaying(true);
    setSnapshot(player.getSnapshot());
  }, [player]);

  const handleSkip = useCallback(() => {
    if (!player) return;
    player.skip();
    setSnapshot(player.getSnapshot());
  }, [player]);

  const handleLike = useCallback(() => {
    if (!player) return;
    player.like();
    setSnapshot(player.getSnapshot());
  }, [player]);

  const handleReset = useCallback(() => {
    if (!player) return;
    player.reset();
    setIsPlaying(false);
    setSnapshot(player.getSnapshot());
  }, [player]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#111827" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Loading journey...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!snapshot) {
    return null;
  }

  const currentTrack = snapshot.tracks[snapshot.currentTrackIndex];
  const playerState = snapshot.playerState;
  const progress = player?.progress || 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#111827" />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Journey Player</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Journey Info */}
        <View style={styles.journeyCard}>
          <Text style={styles.journeyId}>Journey: {snapshot.journeyId}</Text>
          <Text style={styles.journeyStatus}>
            Status: {playerState} | Tracks: {snapshot.tracks.length}
          </Text>
        </View>

        {/* Current Track */}
        <View style={styles.trackCard}>
          <Text style={styles.trackLabel}>Current Track</Text>
          <Text style={styles.trackId}>{currentTrack?.id || '—'}</Text>
          <Text style={styles.trackState}>State: {currentTrack?.state || '—'}</Text>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controlsCard}>
          <Text style={styles.controlsLabel}>Playback Controls</Text>

          <View style={styles.controlsRow}>
            {playerState === PlayerState.IDLE ? (
              <TouchableOpacity
                style={[styles.controlButton, styles.controlButtonPrimary]}
                onPress={handleStart}
              >
                <Text style={styles.controlButtonText}>▶ Start</Text>
              </TouchableOpacity>
            ) : playerState === PlayerState.PLAYING ? (
              <TouchableOpacity
                style={[styles.controlButton, styles.controlButtonSecondary]}
                onPress={handlePause}
              >
                <Text style={styles.controlButtonText}>⏸ Pause</Text>
              </TouchableOpacity>
            ) : playerState === PlayerState.PAUSED ? (
              <TouchableOpacity
                style={[styles.controlButton, styles.controlButtonPrimary]}
                onPress={handleResume}
              >
                <Text style={styles.controlButtonText}>▶ Resume</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.controlButton, styles.controlButtonDisabled]}
                disabled
              >
                <Text style={styles.controlButtonText}>Completed</Text>
              </TouchableOpacity>
            )}

            {(playerState === PlayerState.PLAYING || playerState === PlayerState.PAUSED) && (
              <>
                <TouchableOpacity
                  style={[styles.controlButton, styles.controlButtonWarn]}
                  onPress={handleSkip}
                >
                  <Text style={styles.controlButtonText}>⏭ Skip</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.controlButton, styles.controlButtonLike]}
                  onPress={handleLike}
                >
                  <Text style={styles.controlButtonText}>❤ Like</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {(playerState === PlayerState.COMPLETED || playerState === PlayerState.IDLE) && (
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>↺ Reset Player</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tracks List */}
        <View style={styles.tracksCard}>
          <Text style={styles.tracksLabel}>Track Slots</Text>
          {snapshot.tracks.map((track: any, idx: number) => (
            <View
              key={track.id}
              style={[
                styles.trackRow,
                idx === snapshot.currentTrackIndex && styles.trackRowActive,
              ]}
            >
              <Text style={styles.trackRowIndex}>{idx + 1}.</Text>
              <Text style={styles.trackRowId}>{track.id}</Text>
              <Text
                style={[
                  styles.trackRowState,
                  track.state === TrackState.LOCKED && styles.trackRowStateLocked,
                  track.state === TrackState.UNLOCKED && styles.trackRowStateUnlocked,
                  track.state === TrackState.PLAYING && styles.trackRowStatePlaying,
                  track.state === TrackState.COMPLETED && styles.trackRowStateCompleted,
                  track.state === TrackState.SKIPPED && styles.trackRowStateSkipped,
                ]}
              >
                {track.state}
              </Text>
            </View>
          ))}
        </View>

        {/* Events Log */}
        <View style={styles.eventsCard}>
          <Text style={styles.eventsLabel}>Recent Events</Text>
          <View style={styles.eventsList}>
            {snapshot.impressions.slice(-5).map((imp: any, idx: number) => (
              <View key={idx} style={styles.eventRow}>
                <Text style={styles.eventTime}>
                  {new Date(imp.timestamp).toLocaleTimeString()}
                </Text>
                <Text style={styles.eventName}>{imp.event}</Text>
                {imp.trackId && (
                  <Text style={styles.eventTrack}>({imp.trackId})</Text>
                )}
              </View>
            ))}
            {snapshot.impressions.length === 0 && (
              <Text style={styles.noEventsText}>No events yet</Text>
            )}
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
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
  },
  content: {
    padding: 16,
    paddingBottom: 24,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
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
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerSpacer: {
    width: 48,
  },
  journeyCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  journeyId: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  journeyStatus: {
    fontSize: 13,
    color: '#10b981',
    marginTop: 4,
  },
  trackCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  trackLabel: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  trackId: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  trackState: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0369a1',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369a1',
    width: 44,
  },
  controlsCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  controlsLabel: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  controlsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  controlButton: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  controlButtonPrimary: {
    backgroundColor: '#0369a1',
  },
  controlButtonSecondary: {
    backgroundColor: '#d97706',
  },
  controlButtonWarn: {
    backgroundColor: '#b91c1c',
  },
  controlButtonLike: {
    backgroundColor: '#be185d',
  },
  controlButtonDisabled: {
    backgroundColor: '#4b5563',
  },
  controlButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  resetButton: {
    alignItems: 'center',
    padding: 10,
  },
  resetButtonText: {
    color: '#6b7280',
    fontSize: 13,
  },
  tracksCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  tracksLabel: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  trackRowActive: {
    backgroundColor: '#1a2b23',
    borderWidth: 1,
    borderColor: '#059669',
  },
  trackRowIndex: {
    width: 24,
    fontSize: 13,
    color: '#6b7280',
  },
  trackRowId: {
    flex: 1,
    fontSize: 13,
    color: '#ffffff',
  },
  trackRowState: {
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trackRowStateLocked: {
    backgroundColor: '#78350f',
    color: '#fbbf24',
  },
  trackRowStateUnlocked: {
    backgroundColor: '#065f46',
    color: '#34d399',
  },
  trackRowStatePlaying: {
    backgroundColor: '#1e40af',
    color: '#60a5fa',
  },
  trackRowStateCompleted: {
    backgroundColor: '#14532d',
    color: '#22c55e',
  },
  trackRowStateSkipped: {
    backgroundColor: '#450a0a',
    color: '#f87171',
  },
  eventsCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  eventsLabel: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  eventsList: {
    gap: 6,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventTime: {
    fontSize: 11,
    color: '#6b7280',
    width: 64,
  },
  eventName: {
    fontSize: 12,
    color: '#0369a1',
    flex: 1,
  },
  eventTrack: {
    fontSize: 11,
    color: '#6b7280',
  },
  noEventsText: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    padding: 20,
  },
  bottomSpacer: {
    height: 20,
  },
});
