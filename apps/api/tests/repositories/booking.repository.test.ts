import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongooseBookingRepository } from '../../src/repositories/adapters/mongoose-booking.repository';
import Booking from '../../src/domains/journeys/booking.model';
import { startMongo, stopMongo, clearCollections } from '../helpers/mongo';
import { buildBooking } from '../helpers/factories';

describe('MongooseBookingRepository', () => {
  const repo = new MongooseBookingRepository();

  before(startMongo);
  beforeEach(() => clearCollections(Booking as never));
  after(stopMongo);

  it('creates and finds a booking', async () => {
    const data = buildBooking({ planner: new mongoose.Types.ObjectId().toString(), dj: new mongoose.Types.ObjectId().toString() });
    const created = await repo.create(data);
    assert.ok(created.id);
    assert.equal(created.budget, data.budget);

    const found = await repo.findById(created.id);
    assert.ok(found);
    assert.equal(found.budget, data.budget);
  });

  it('finds bookings by planner', async () => {
    const plannerId = new mongoose.Types.ObjectId().toString();
    const data = buildBooking({ planner: plannerId, dj: new mongoose.Types.ObjectId().toString() });
    await repo.create(data);

    const results = await repo.findByPlanner(plannerId);
    assert.equal(results.length, 1);
    assert.equal(results[0].planner, plannerId);
  });

  it('finds bookings by dj', async () => {
    const djId = new mongoose.Types.ObjectId().toString();
    const data = buildBooking({ planner: new mongoose.Types.ObjectId().toString(), dj: djId });
    await repo.create(data);

    const results = await repo.findByDj(djId);
    assert.equal(results.length, 1);
    assert.equal(results[0].dj, djId);
  });

  it('updates a booking', async () => {
    const data = buildBooking({ planner: new mongoose.Types.ObjectId().toString(), dj: new mongoose.Types.ObjectId().toString() });
    const created = await repo.create(data);
    const updated = await repo.update(created.id, { status: 'ACCEPTED' });
    assert.ok(updated);
    assert.equal(updated.status, 'ACCEPTED');
  });

  it('deletes a booking', async () => {
    const data = buildBooking({ planner: new mongoose.Types.ObjectId().toString(), dj: new mongoose.Types.ObjectId().toString() });
    const created = await repo.create(data);
    const deleted = await repo.delete(created.id);
    assert.equal(deleted, true);
    const found = await repo.findById(created.id);
    assert.equal(found, null);
  });
});
