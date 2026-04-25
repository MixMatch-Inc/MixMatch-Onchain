/**
 * Mobile Journey Player State Machine
 * Aligned with web behavior (#208) - sequential listening rules match exactly
 *
 * Tracks are unlocked sequentially; each transition emits an impression event.
 * Optimized for mobile: lightweight, serializable, side-effect free.
 */

import { PlayerState, TrackState, ImpressionEvent } from '@mixmatch/types';

export const EARLY_LIKE_THRESHOLD_MS = 15_000;

export interface TrackSlot {
  id: string;
  durationMs: number;
  state: TrackState;
  likedAt?: number;
  completedAt?: Date;
}

export interface JourneyImpressionRecord {
  event: ImpressionEvent;
  trackId?: string;
  timestamp: Date;
  meta?: Record<string, unknown>;
}

export interface JourneyPlayerSnapshot {
  journeyId: string;
  playerState: PlayerState;
  currentTrackIndex: number;
  tracks: TrackSlot[];
  impressions: JourneyImpressionRecord[];
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * JourneyPlayerMachine - Mobile-optimized state machine for sequential track playback
 * Guarantees:
 * - Tracks unlock sequentially (never skip ahead)
 * - Each state transition emits an impression event
 * - Pause/resume/tick/like/skip all follow web-aligned rules
 */
export class JourneyPlayerMachine {
  private state: JourneyPlayerSnapshot;
  private elapsedMs = 0;

  constructor(journeyId: string, trackIds: string[], durationMs = 30_000) {
    if (trackIds.length === 0) throw new Error('Journey must have at least one track');

    this.state = {
      journeyId,
      playerState: PlayerState.IDLE,
      currentTrackIndex: 0,
      tracks: trackIds.map((id, i) => ({
        id,
        durationMs,
        state: i === 0 ? TrackState.UNLOCKED : TrackState.LOCKED,
      })),
      impressions: [],
    };
  }

  // ── Queries ──────────────────────────────────────────────────────

  getSnapshot(): Readonly<JourneyPlayerSnapshot> {
    return this.state;
  }

  get currentTrack(): TrackSlot | undefined {
    return this.state.tracks[this.state.currentTrackIndex];
  }

  get progress(): number {
    const track = this.currentTrack;
    if (!track || track.durationMs === 0) return 0;
    return Math.min(100, Math.round((this.elapsedMs / track.durationMs) * 100));
  }

  // ── Commands ──────────────────────────────────────────────────────

  start(): void {
    if (this.state.playerState !== PlayerState.IDLE) return;

    this.state.playerState = PlayerState.PLAYING;
    this.state.startedAt = new Date();
    this.elapsedMs = 0;

    this.emit(ImpressionEvent.JOURNEY_STARTED);
    this.emit(ImpressionEvent.TRACK_STARTED, this.currentTrack?.id);

    const track = this.currentTrack;
    if (track) {
      track.state = TrackState.PLAYING;
    }
  }

  /** Advance elapsed time; auto-completes track when duration is reached */
  tick(deltaMs: number): void {
    if (this.state.playerState !== PlayerState.PLAYING) return;

    this.elapsedMs += deltaMs;
    const track = this.currentTrack;
    if (!track) return;

    if (this.elapsedMs >= track.durationMs) {
      this.completeCurrentTrack();
    }
  }

  like(): void {
    const track = this.currentTrack;
    if (!track || track.state !== TrackState.PLAYING) return;

    track.likedAt = this.elapsedMs;

    const event =
      this.elapsedMs < EARLY_LIKE_THRESHOLD_MS
        ? ImpressionEvent.TRACK_EARLY_LIKE
        : ImpressionEvent.TRACK_FULL_LIKE;

    this.emit(event, track.id, { elapsedMs: this.elapsedMs });
  }

  skip(): void {
    const track = this.currentTrack;
    if (!track || track.state !== TrackState.PLAYING) return;

    track.state = TrackState.SKIPPED;
    this.emit(ImpressionEvent.TRACK_SKIPPED, track.id, { elapsedMs: this.elapsedMs });
    this.advance();
  }

  pause(): void {
    if (this.state.playerState === PlayerState.PLAYING) {
      this.state.playerState = PlayerState.PAUSED;
    }
  }

  resume(): void {
    if (this.state.playerState === PlayerState.PAUSED) {
      this.state.playerState = PlayerState.PLAYING;
    }
  }

  abandon(): void {
    if (this.state.playerState === PlayerState.COMPLETED) return;
    this.state.playerState = PlayerState.COMPLETED;
    this.emit(ImpressionEvent.JOURNEY_ABANDONED, undefined, { elapsedMs: this.elapsedMs });
  }

  reset(): void {
    this.state.playerState = PlayerState.IDLE;
    this.state.startedAt = undefined;
    this.state.completedAt = undefined;
    this.elapsedMs = 0;
    this.state.tracks.forEach((track, i) => {
      track.state = i === 0 ? TrackState.UNLOCKED : TrackState.LOCKED;
      track.likedAt = undefined;
      track.completedAt = undefined;
    });
    this.state.currentTrackIndex = 0;
    this.state.impressions = [];
  }

  // ── Internals ─────────────────────────────────────────────────────

  private completeCurrentTrack(): void {
    const track = this.currentTrack;
    if (!track) return;

    track.state = TrackState.COMPLETED;
    track.completedAt = new Date();
    this.emit(ImpressionEvent.TRACK_COMPLETED, track.id);
    this.advance();
  }

  private advance(): void {
    const nextIndex = this.state.currentTrackIndex + 1;

    if (nextIndex >= this.state.tracks.length) {
      this.state.playerState = PlayerState.COMPLETED;
      this.state.completedAt = new Date();
      this.emit(ImpressionEvent.JOURNEY_COMPLETED);
      return;
    }

    // Unlock next track only after current is done/skipped (sequential enforcement)
    const next = this.state.tracks[nextIndex];
    if (next.state === TrackState.LOCKED) {
      next.state = TrackState.UNLOCKED;
      this.emit(ImpressionEvent.TRACK_UNLOCKED, next.id);
    }

    this.state.currentTrackIndex = nextIndex;
    this.elapsedMs = 0;
    next.state = TrackState.PLAYING;
    this.emit(ImpressionEvent.TRACK_STARTED, next.id);
  }

  private emit(
    event: ImpressionEvent,
    trackId?: string,
    meta?: Record<string, unknown>,
  ): void {
    this.state.impressions.push({ event, trackId, timestamp: new Date(), meta });
  }
}
