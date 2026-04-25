import { test } from 'node:test';
import assert from 'node:assert';
import { AnalyticsEvent, validateAnalyticsPayload } from '@mixmatch/analytics';

test('analytics: valid payload passes validation', () => {
  const result = validateAnalyticsPayload(AnalyticsEvent.ONBOARDING_STARTED, {
    userId: 'u1',
    role: 'DJ',
  });
  assert.ok(result.valid);
  assert.strictEqual(result.missingFields.length, 0);
});

test('analytics: missing required field fails validation', () => {
  const result = validateAnalyticsPayload(AnalyticsEvent.ONBOARDING_STARTED, {
    userId: 'u1',
    // role missing
  });
  assert.ok(!result.valid);
  assert.deepStrictEqual(result.missingFields, ['role']);
});

test('analytics: null field counts as missing', () => {
  const result = validateAnalyticsPayload(AnalyticsEvent.JOURNEY_TRACK_ADDED, {
    userId: 'u1',
    journeyId: 'j1',
    trackId: null,
  });
  assert.ok(!result.valid);
  assert.deepStrictEqual(result.missingFields, ['trackId']);
});

test('analytics: resonance_created requires userId, journeyId, score', () => {
  const result = validateAnalyticsPayload(AnalyticsEvent.RESONANCE_CREATED, {
    userId: 'u1',
    journeyId: 'j1',
    score: 0.9,
  });
  assert.ok(result.valid);
});
