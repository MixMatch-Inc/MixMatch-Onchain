/**
 * Journey Player State Machine (#208)
 *
 * Encodes the listening progression rules for MixMatch discovery.
 * Tracks are unlocked sequentially; each transition emits an impression event.
 */

export enum TrackState {
  LOCKED = 'LOCKED',
  UNLOCKED = 'UNLOCKED',
  PLAYING = 'PLAYING',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
}

export enum PlayerState {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
}

export enum ImpressionEvent {
  JOURNEY_STARTED = 'JOURNEY_STARTED',
  TRACK_UNLOCKED = 'TRACK_UNLOCKED',
  TRACK_STARTED = 'TRACK_STARTED',
  TRACK_EARLY_LIKE = 'TRACK_EARLY_LIKE',
  TRACK_FULL_LIKE = 'TRACK_FULL_LIKE',
  TRACK_SKIPPED = 'TRACK_SKIPPED',
  TRACK_COMPLETED = 'TRACK_COMPLETED',
  JOURNEY_COMPLETED = 'JOURNEY_COMPLETED',
  JOURNEY_ABANDONED = 'JOURNEY_ABANDONED',
}

export interface TrackSlot {
  id: string;
  durationMs: number;
  state: TrackState;
  likedAt?: number; // ms elapsed when liked
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

/** Threshold (ms elapsed) before a like is considered "early" vs "full" */
const EARLY_LIKE_THRESHOLD_MS = 15_000;

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

  // ── Queries ──────────────────────────────────────────────────────────────

  getSnapshot(): Readonly<JourneyPlayerSnapshot> {
    return this.state;
  }

  get currentTrack(): TrackSlot | undefined {
    return this.state.tracks[this.state.currentTrackIndex];
  }

  // ── Commands ─────────────────────────────────────────────────────────────

  start(): void {
    if (this.state.playerState !== PlayerState.IDLE) return;

    this.state.playerState = PlayerState.PLAYING;
    this.state.startedAt = new Date();
    this.elapsedMs = 0;

    this.emit(ImpressionEvent.JOURNEY_STARTED);
    this.emit(ImpressionEvent.TRACK_STARTED, this.currentTrack?.id);

    if (this.currentTrack) {
      this.currentTrack.state = TrackState.PLAYING;
    }
  }

  /** Advance elapsed time; auto-completes track when duration is reached. */
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

  // ── Internals ─────────────────────────────────────────────────────────────

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
