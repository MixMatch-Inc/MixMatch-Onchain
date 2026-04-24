import test, { after, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { RevealPhase, RevealTrigger } from '@mixmatch/types';
import { RevealService } from '../src/modules/profiles/reveal.service';
import RevealState from '../src/modules/profiles/reveal-state.model';

let mongoServer: MongoMemoryServer;

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongoServer.getUri();
  await mongoose.connect(process.env.MONGO_URI);
});

beforeEach(async () => {
  await RevealState.deleteMany({});
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test('ensureRevealState creates new state', async () => {
  const viewerId = 'viewer123';
  const targetProfileId = 'profile123';
  const targetProfileType = 'dj' as const;

  const state = await RevealService.ensureRevealState(viewerId, targetProfileId, targetProfileType);

  assert.equal(state.viewerId.toString(), viewerId);
  assert.equal(state.targetProfileId.toString(), targetProfileId);
  assert.equal(state.currentPhase, RevealPhase.BLIND);
  assert.deepEqual(state.revealTriggers, []);
});

test('triggerReveal updates phase', async () => {
  const viewerId = 'viewer123';
  const targetProfileId = 'profile123';
  const targetProfileType = 'dj' as const;

  const state = await RevealService.triggerReveal(
    viewerId,
    targetProfileId,
    targetProfileType,
    RevealTrigger.MUTUAL_FOLLOW,
    RevealPhase.BASIC
  );

  assert(state.revealTriggers.includes(RevealTrigger.MUTUAL_FOLLOW));
  assert.equal(state.currentPhase, RevealPhase.BASIC);
  assert(state.revealTimestamps.get(RevealPhase.BASIC) instanceof Date);
});

test('visibility helpers work correctly', async () => {
  assert.equal(RevealService.canViewName(RevealPhase.BLIND), false);
  assert.equal(RevealService.canViewName(RevealPhase.BASIC), true);

  assert.equal(RevealService.canViewBio(RevealPhase.ANONYMOUS), false);
  assert.equal(RevealService.canViewBio(RevealPhase.BASIC), true);

  assert.equal(RevealService.canViewImages(RevealPhase.BLIND), false);
  assert.equal(RevealService.canViewImages(RevealPhase.ANONYMOUS), true);

  assert.equal(RevealService.canViewExternalLinks(RevealPhase.BASIC), false);
  assert.equal(RevealService.canViewExternalLinks(RevealPhase.FULL), true);
});

test('redactProfile redacts correctly', async () => {
  const fullProfile = {
    id: '123',
    stageName: 'DJ Test',
    bio: 'Test bio',
    genres: ['HOUSE'],
    vibeTags: ['energetic'],
    pricing: { min: 100, max: 500 },
    location: 'NYC',
    availabilityStatus: 'AVAILABLE',
    socialLinks: { instagram: '@djtest' },
    website: 'http://djtest.com',
    images: ['image1.jpg'],
  };

  const redacted = RevealService.redactProfile(fullProfile, RevealPhase.BLIND);

  assert.equal(redacted.stageName, 'Anonymous DJ');
  assert.equal(redacted.bio, undefined);
  assert.equal(redacted.location, undefined);
  assert.equal(redacted.pricing, undefined);
  assert.deepEqual(redacted.socialLinks, {});
  assert.equal(redacted.website, undefined);
  assert.deepEqual(redacted.images, []);
});