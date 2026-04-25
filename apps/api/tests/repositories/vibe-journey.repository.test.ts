import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongooseVibeJourneyRepository } from '../../src/repositories/adapters/mongoose-vibe-journey.repository';
import VibeJourney from '../../src/domains/journeys/vibe-journey.model';
import { startMongo, stopMongo, clearCollections } from '../helpers/mongo';
import { buildVibeJourney } from '../helpers/factories';

describe('MongooseVibeJourneyRepository', () => {
  const repo = new MongooseVibeJourneyRepository();

  before(startMongo);
  beforeEach(() => clearCollections(VibeJourney as never));
  after(stopMongo);

  it('creates and finds a journey', async () => {
    const authorId = new mongoose.Types.ObjectId().toString();
    const data = buildVibeJourney({ authorId });
    const created = await repo.create(data);
    assert.ok(created.id);
    assert.equal(created.title, data.title);

    const found = await repo.findById(created.id);
    assert.ok(found);
    assert.equal(found.title, data.title);
  });

  it('finds journeys by author', async () => {
    const authorId = new mongoose.Types.ObjectId().toString();
    await repo.create(buildVibeJourney({ authorId }));

    const results = await repo.findByAuthor(authorId);
    assert.equal(results.length, 1);
  });

  it('publishes a journey', async () => {
    const authorId = new mongoose.Types.ObjectId().toString();
    const created = await repo.create(buildVibeJourney({ authorId }));

    const published = await repo.publish(created.id);
    assert.ok(published);
    assert.equal(published.status, 'PUBLISHED');
  });

  it('updates a draft journey', async () => {
    const authorId = new mongoose.Types.ObjectId().toString();
    const created = await repo.create(buildVibeJourney({ authorId }));

    const updated = await repo.updateDraft(created.id, { title: 'Updated Title' });
    assert.ok(updated);
    assert.equal(updated.title, 'Updated Title');
  });
});
