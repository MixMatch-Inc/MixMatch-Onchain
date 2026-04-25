/**
 * Journey Player Contract Tests (#248)
 *
 * Shared behavior vectors for the JourneyPlayerMachine.
 * These tests must pass on any client that implements the player contract.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  JourneyPlayerMachine,
  PlayerState,
  TrackState,
  ImpressionEvent,
} from '../lib/journey-player';

// ── helpers ──────────────────────────────────────────────────────────────────

function makePlayer(trackCount = 3, durationMs = 30_000) {
  const ids = Array.from({ length: trackCount }, (_, i) => `track_${i}`);
  return new JourneyPlayerMachine('journey_test', ids, durationMs);
}

// ── slot unlock ───────────────────────────────────────────────────────────────

test('first track is UNLOCKED, rest are LOCKED before start', () => {
  const player = makePlayer(3);
  const { tracks } = player.getSnapshot();
  assert.equal(tracks[0].state, TrackState.UNLOCKED);
  assert.equal(tracks[1].state, TrackState.LOCKED);
  assert.equal(tracks[2].state, TrackState.LOCKED);
});

test('start() transitions player to PLAYING and first track to PLAYING', () => {
  const player = makePlayer();
  player.start();
  const snap = player.getSnapshot();
  assert.equal(snap.playerState, PlayerState.PLAYING);
  assert.equal(snap.tracks[0].state, TrackState.PLAYING);
});

test('completing a track unlocks the next slot', () => {
  const player = makePlayer(3, 100);
  player.start();
  player.tick(100); // completes track_0
  const snap = player.getSnapshot();
  assert.equal(snap.tracks[0].state, TrackState.COMPLETED);
  assert.equal(snap.tracks[1].state, TrackState.PLAYING);
  assert.equal(snap.tracks[2].state, TrackState.LOCKED);
});

test('skipping a track unlocks the next slot', () => {
  const player = makePlayer(3);
  player.start();
  player.skip();
  const snap = player.getSnapshot();
  assert.equal(snap.tracks[0].state, TrackState.SKIPPED);
  assert.equal(snap.tracks[1].state, TrackState.PLAYING);
});

// ── early-like events ─────────────────────────────────────────────────────────

test('like before 15 s emits TRACK_EARLY_LIKE', () => {
  const player = makePlayer(1, 60_000);
  player.start();
  player.tick(10_000);
  player.like();
  const events = player.getSnapshot().impressions.map(i => i.event);
  assert.ok(events.includes(ImpressionEvent.TRACK_EARLY_LIKE));
  assert.ok(!events.includes(ImpressionEvent.TRACK_FULL_LIKE));
});

test('like at or after 15 s emits TRACK_FULL_LIKE', () => {
  const player = makePlayer(1, 60_000);
  player.start();
  player.tick(15_000);
  player.like();
  const events = player.getSnapshot().impressions.map(i => i.event);
  assert.ok(events.includes(ImpressionEvent.TRACK_FULL_LIKE));
  assert.ok(!events.includes(ImpressionEvent.TRACK_EARLY_LIKE));
});

// ── skip ──────────────────────────────────────────────────────────────────────

test('skip emits TRACK_SKIPPED with elapsed metadata', () => {
  const player = makePlayer(2, 60_000);
  player.start();
  player.tick(5_000);
  player.skip();
  const skipped = player.getSnapshot().impressions.find(
    i => i.event === ImpressionEvent.TRACK_SKIPPED,
  );
  assert.ok(skipped);
  assert.equal(skipped.trackId, 'track_0');
  assert.equal((skipped.meta as any)?.elapsedMs, 5_000);
});

// ── replay attempts ───────────────────────────────────────────────────────────

test('start() is a no-op when already PLAYING', () => {
  const player = makePlayer();
  player.start();
  player.start(); // second call should be ignored
  const events = player.getSnapshot().impressions.filter(
    i => i.event === ImpressionEvent.JOURNEY_STARTED,
  );
  assert.equal(events.length, 1);
});

test('tick() is a no-op when PAUSED', () => {
  const player = makePlayer(1, 100);
  player.start();
  player.pause();
  player.tick(100); // should not complete the track
  assert.equal(player.getSnapshot().tracks[0].state, TrackState.PLAYING);
});

// ── completion summary ────────────────────────────────────────────────────────

test('completing all tracks emits JOURNEY_COMPLETED', () => {
  const player = makePlayer(2, 100);
  player.start();
  player.tick(100); // complete track_0
  player.tick(100); // complete track_1
  const snap = player.getSnapshot();
  assert.equal(snap.playerState, PlayerState.COMPLETED);
  const events = snap.impressions.map(i => i.event);
  assert.ok(events.includes(ImpressionEvent.JOURNEY_COMPLETED));
  assert.ok(snap.completedAt instanceof Date);
});

test('abandon() emits JOURNEY_ABANDONED and sets COMPLETED state', () => {
  const player = makePlayer();
  player.start();
  player.abandon();
  const snap = player.getSnapshot();
  assert.equal(snap.playerState, PlayerState.COMPLETED);
  const events = snap.impressions.map(i => i.event);
  assert.ok(events.includes(ImpressionEvent.JOURNEY_ABANDONED));
});

test('abandon() after JOURNEY_COMPLETED is a no-op', () => {
  const player = makePlayer(1, 100);
  player.start();
  player.tick(100);
  player.abandon();
  const events = player.getSnapshot().impressions.filter(
    i => i.event === ImpressionEvent.JOURNEY_ABANDONED,
  );
  assert.equal(events.length, 0);
});

// ── pause / resume ────────────────────────────────────────────────────────────

test('pause() and resume() toggle player state', () => {
  const player = makePlayer();
  player.start();
  player.pause();
  assert.equal(player.getSnapshot().playerState, PlayerState.PAUSED);
  player.resume();
  assert.equal(player.getSnapshot().playerState, PlayerState.PLAYING);
});
