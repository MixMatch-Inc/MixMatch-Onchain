import { RevealPhase, PlayerState, TrackState, ImpressionEvent } from '@mixmatch/types';
import { JourneyPlayerMachine as WebJourneyPlayer } from '@mixmatch/mobile-test-harness';

export { RevealPhase, PlayerState, TrackState, ImpressionEvent };

export interface TrackSlot {
  id: string;
  durationMs: number;
  state: TrackState;
  likedAt?: number;
  completedAt?: Date;
}

export interface JourneyPlayerSnapshot {
  journeyId: string;
  playerState: PlayerState;
  currentTrackIndex: number;
  tracks: TrackSlot[];
  impressions: Array<{
    event: ImpressionEvent;
    trackId?: string;
    timestamp: Date;
    meta?: Record<string, unknown>;
  }>;
  startedAt?: Date;
  completedAt?: Date;
}

export interface DiscoveryDjItem {
  id: string;
  stageName: string;
  bio?: string;
  genres: string[];
  vibeTags: string[];
  pricing?: { min: number; max: number };
  availabilityStatus: string;
  revealPhase: RevealPhase;
}

export interface DiscoveryCardData extends DiscoveryDjItem {
  journeyProgress?: number;
}

export interface BlindDiscoveryFilters {
  genre?: string;
  availabilityStatus?: string;
}

export interface JourneyDraft {
  id?: string;
  title: string;
  description?: string;
  slots: Array<{
    index: number;
    trackId?: string;
    authoredNote?: string;
  }>;
  version: number;
}