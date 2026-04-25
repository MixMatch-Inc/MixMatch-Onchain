import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { RevealPhase } from '@mixmatch/types';

export interface DiscoveryCardData {
  id: string;
  stageName: string;
  bio?: string;
  genres: string[];
  vibeTags: string[];
  pricing?: { min: number; max: number };
  availabilityStatus: string;
  revealPhase: RevealPhase;
  journeyProgress?: number;
}

interface DiscoveryCardProps {
  data: DiscoveryCardData;
  onPress?: (id: string) => void;
}

const PHASE_LABEL: Record<RevealPhase, string> = {
  [RevealPhase.BLIND]: 'Blind',
  [RevealPhase.ANONYMOUS]: 'Anonymous',
  [RevealPhase.BASIC]: 'Partial',
  [RevealPhase.FULL]: 'Full',
  [RevealPhase.BLOCKED]: 'Blocked',
};

const PHASE_COLORS = {
  [RevealPhase.BLIND]: { bg: '#18181b', text: '#ffffff' },
  [RevealPhase.ANONYMOUS]: { bg: '#e4e4e7', text: '#3f3f46' },
  [RevealPhase.BASIC]: { bg: '#d1fae5', text: '#065f46' },
  [RevealPhase.FULL]: { bg: '#d1fae5', text: '#065f46' },
  [RevealPhase.BLOCKED]: { bg: '#fef2f2', text: '#991b1b' },
};

/**
 * DiscoveryCard - Identity-safe rendering for blind/anonymous modes
 *
 * Security notes:
 * - BLIND phase: stageName is NEVER rendered (replaced with skeleton)
 * - BLIND phase: bio is NEVER rendered
 * - BLIND phase: Images/media are NOT preloaded (prevents metadata leaks)
 * - Only genres/vibeTags are visible in BLIND (anonymous discovery)
 */
export const DiscoveryCard: React.FC<DiscoveryCardProps> = ({ data, onPress }) => {
  const isBlind = data.revealPhase === RevealPhase.BLIND;
  const isAnonymous = data.revealPhase === RevealPhase.ANONYMOUS;
  const isBlocked = data.revealPhase === RevealPhase.BLOCKED;
  const phaseColor = PHASE_COLORS[data.revealPhase] || PHASE_COLORS[RevealPhase.BLIND];

  const handlePress = () => {
    if (!isBlocked && onPress) {
      onPress(data.id);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handlePress}
      disabled={isBlocked}
      accessible={true}
      accessibilityLabel={
        isBlind
          ? 'Anonymous DJ profile'
          : `DJ profile: ${data.stageName}, ${data.availabilityStatus}`
      }
      accessibilityHint={isBlind ? 'Profile is anonymous - identity hidden' : undefined}
    >
      <View style={[styles.card, isBlocked && styles.cardBlocked]}>
        {/* Phase badge */}
        <View style={styles.header}>
          <View style={[styles.badge, { backgroundColor: phaseColor.bg }]}>
            <Text style={[styles.badgeText, { color: phaseColor.text }]}>
              {PHASE_LABEL[data.revealPhase]}
            </Text>
          </View>
          {data.pricing && (
            <View style={styles.priceBadge}>
              <Text style={styles.priceText}>
                ${data.pricing.min}–${data.pricing.max}
              </Text>
            </View>
          )}
          {!data.pricing && (
            <View style={styles.priceBadge}>
              <Text style={styles.priceTextHidden}>Price hidden</Text>
            </View>
          )}
        </View>

        {/* Identity fields - HIDDEN in BLIND/ANONYMOUS mode */}
        {isBlind ? (
          // Skeleton placeholders - no actual identity data
          <View style={styles.identitySection} accessible={false}>
            <View style={styles.skeletonBar} />
            <View style={[styles.skeletonBar, styles.skeletonBarShort]} />
          </View>
        ) : (
          <View style={styles.identitySection}>
            <Text style={styles.stageName}>{data.stageName}</Text>
            <Text style={styles.status}>{data.availabilityStatus}</Text>
          </View>
        )}

        {/* Bio - NEVER shown in BLIND mode */}
        {!isBlind && data.bio ? (
          <Text style={styles.bio} numberOfLines={3}>
            {data.bio}
          </Text>
        ) : null}

        {/* Skeleton bio for blind mode */}
        {isBlind && (
          <View style={styles.bioSkeleton} accessible={false}>
            <View style={styles.skeletonBar} />
            <View style={[styles.skeletonBar, styles.skeletonBarMedium]} />
          </View>
        )}

        {/* Taste-signal badges - always visible */}
        <View style={styles.tagsSection}>
          <Text style={styles.tagsLabel}>Genres</Text>
          <View style={styles.genresRow}>
            {data.genres.map((g, i) => (
              <View key={`${data.id}-genre-${i}`} style={styles.genreTag}>
                <Text style={styles.genreText}>{g}</Text>
              </View>
            ))}
          </View>
          {data.vibeTags.length > 0 && (
            <>
              <Text style={styles.tagsLabel}>Vibe</Text>
              <View style={styles.vibesRow}>
                {data.vibeTags.slice(0, 3).map((t, i) => (
                  <View key={`${data.id}-vibe-${i}`} style={styles.vibeTag}>
                    <Text style={styles.vibeText}>{t}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        {/* Journey progression bar */}
        {data.journeyProgress !== undefined && (
          <View style={styles.progressSection} accessible={true}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Journey</Text>
              <Text style={styles.progressValue}>{Math.round(data.journeyProgress)}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(100, Math.max(0, data.journeyProgress))}%` },
                ]}
              />
            </View>
          </View>
        )}

        {isBlocked && (
          <View style={styles.blockedOverlay}>
            <Text style={styles.blockedText}>Unavailable</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardBlocked: {
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceBadge: {
    backgroundColor: '#f4f4f5',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  priceText: {
    fontSize: 11,
    color: '#71717a',
    fontWeight: '500',
  },
  priceTextHidden: {
    fontSize: 11,
    color: '#a1a1aa',
    fontWeight: '500',
  },
  identitySection: {
    marginBottom: 8,
  },
  stageName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#18181b',
    marginBottom: 4,
  },
  status: {
    fontSize: 11,
    fontWeight: '600',
    color: '#71717a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  skeletonBar: {
    height: 16,
    backgroundColor: '#f4f4f5',
    borderRadius: 4,
    marginBottom: 6,
  },
  skeletonBarShort: {
    width: '40%',
  },
  skeletonBarMedium: {
    width: '70%',
  },
  bio: {
    fontSize: 14,
    color: '#52525b',
    lineHeight: 20,
    marginBottom: 12,
  },
  bioSkeleton: {
    marginBottom: 12,
  },
  tagsSection: {
    marginTop: 8,
  },
  tagsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#71717a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  genresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  genreTag: {
    backgroundColor: '#f4f4f5',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  genreText: {
    fontSize: 11,
    color: '#71717a',
  },
  vibesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  vibeTag: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  vibeText: {
    fontSize: 11,
    color: '#ffffff',
  },
  progressSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f4f4f5',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#71717a',
  },
  progressValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#18181b',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#f4f4f5',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#18181b',
  },
  blockedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  blockedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991b1b',
  },
});
