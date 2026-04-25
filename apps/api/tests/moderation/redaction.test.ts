import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ModerationState } from '@mixmatch/types';
import { isRedacted, redactJourney, redactDjProfile } from '../../src/domains/moderation/redaction';

describe('redaction helpers', () => {
  it('isRedacted returns false for CLEAR', () => {
    assert.strictEqual(isRedacted({ moderationState: ModerationState.CLEAR }), false);
  });

  it('isRedacted returns false for UNDER_REVIEW', () => {
    assert.strictEqual(isRedacted({ moderationState: ModerationState.UNDER_REVIEW }), false);
  });

  it('isRedacted returns true for BANNED', () => {
    assert.strictEqual(isRedacted({ moderationState: ModerationState.BANNED }), true);
  });

  it('isRedacted returns true for RESTRICTED', () => {
    assert.strictEqual(isRedacted({ moderationState: ModerationState.RESTRICTED }), true);
  });

  it('redactJourney masks title and slots for BANNED journey', () => {
    const journey = {
      moderationState: ModerationState.BANNED,
      title: 'My Journey',
      description: 'Some description',
      slots: [{ order: 0, trackRef: 'abc', platform: 'spotify' }],
    };
    const result = redactJourney(journey);
    assert.strictEqual(result.title, '[removed]');
    assert.strictEqual(result.description, undefined);
    assert.deepStrictEqual(result.slots, []);
  });

  it('redactJourney leaves CLEAR journey unchanged', () => {
    const journey = {
      moderationState: ModerationState.CLEAR,
      title: 'My Journey',
      description: 'desc',
      slots: [{ order: 0, trackRef: 'abc', platform: 'spotify' }],
    };
    const result = redactJourney(journey);
    assert.strictEqual(result.title, 'My Journey');
    assert.strictEqual(result.slots?.length, 1);
  });

  it('redactDjProfile masks stageName for RESTRICTED profile', () => {
    const profile = {
      moderationState: ModerationState.RESTRICTED,
      stageName: 'DJ Cool',
      bio: 'Some bio',
    };
    const result = redactDjProfile(profile);
    assert.strictEqual(result.stageName, '[removed]');
    assert.strictEqual(result.bio, undefined);
  });

  it('redactDjProfile leaves CLEAR profile unchanged', () => {
    const profile = {
      moderationState: ModerationState.CLEAR,
      stageName: 'DJ Cool',
      bio: 'Some bio',
    };
    const result = redactDjProfile(profile);
    assert.strictEqual(result.stageName, 'DJ Cool');
    assert.strictEqual(result.bio, 'Some bio');
  });
});
