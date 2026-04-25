import mongoose from 'mongoose';
import Impression from '../discovery/impression.model';
import Resonance, { IResonanceDocument } from './resonance.model';

/**
 * Builds a canonical pair key so (A,B) and (B,A) map to the same key.
 */
function pairKey(idA: string, idB: string): string {
  return [idA, idB].sort().join('_');
}

/**
 * Check whether `actorId` has sent a `like` impression targeting `targetProfileId`.
 */
async function hasLiked(actorId: string, targetProfileId: string): Promise<boolean> {
  const doc = await Impression.findOne({
    viewerId: new mongoose.Types.ObjectId(actorId),
    targetProfileId: new mongoose.Types.ObjectId(targetProfileId),
    eventType: 'like',
  }).lean();
  return doc !== null;
}

/**
 * Called after a `like` impression is recorded.
 * If the other party has already liked back, creates exactly one resonance record.
 * Returns the resonance if created, or null if not mutual yet.
 */
export async function tryCreateResonance(
  likerId: string,
  likedProfileOwnerId: string,
): Promise<IResonanceDocument | null> {
  // Check reciprocal like
  const reciprocal = await hasLiked(likedProfileOwnerId, likerId);
  if (!reciprocal) return null;

  const key = pairKey(likerId, likedProfileOwnerId);

  // Upsert — prevents duplicates even under concurrent requests
  const resonance = await Resonance.findOneAndUpdate(
    { pairKey: key },
    {
      $setOnInsert: {
        userA: new mongoose.Types.ObjectId([likerId, likedProfileOwnerId].sort()[0]),
        userB: new mongoose.Types.ObjectId([likerId, likedProfileOwnerId].sort()[1]),
        pairKey: key,
        status: 'active',
        revealInitialized: false,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return resonance;
}

/**
 * Returns all active resonances for a given user.
 */
export async function getResonancesForUser(userId: string): Promise<IResonanceDocument[]> {
  const oid = new mongoose.Types.ObjectId(userId);
  return Resonance.find({
    $or: [{ userA: oid }, { userB: oid }],
    status: 'active',
  }).lean() as unknown as IResonanceDocument[];
}
// Resonance service with event bus integration

import Resonance, { IResonanceDocument, ResonanceRevealStatus, SongExchangeState } from './resonance.model';
import { getEventBus, getOutboxDispatcher } from '../events';
import { ResonanceCreatedPayload } from '../events/domain-events';

export class ResonanceNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResonanceNotFoundError';
  }
}

export class ResonanceAlreadyExistsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResonanceAlreadyExistsError';
  }
}

/**
 * Create a new resonance (match) between two users
 */
export const createResonance = async (
  userId: string,
  matchedUserId: string,
  score?: number
): Promise<IResonanceDocument> => {
  // Check if resonance already exists (bidirectional check)
  const existing = await Resonance.findOne({
    $or: [
      { userId, matchedUserId },
      { userId: matchedUserId, matchedUserId: userId },
    ],
  });

  if (existing) {
    throw new ResonanceAlreadyExistsError('Resonance already exists between these users');
  }

  // Create resonance
  const resonance = await Resonance.create({
    userId,
    matchedUserId,
    revealStatus: ResonanceRevealStatus.PENDING,
    songExchangeState: SongExchangeState.NONE,
    lastActivityAt: new Date(),
  });

  // Emit domain event
  const eventBus = getEventBus();
  const outboxDispatcher = getOutboxDispatcher();

  const payload: ResonanceCreatedPayload = {
    resonanceId: resonance._id as string,
    userId,
    journeyId: '', // Will be populated when linked to journeys
    score: score || 0,
  };

  const event = eventBus.createEvent(
    'RESONANCE_CREATED' as any,
    payload,
    { userId }
  );

  // Save to outbox for reliable dispatch
  await outboxDispatcher.saveToOutbox(event);

  // Publish to in-process event bus
  await eventBus.publish(event);

  return resonance;
};

/**
 * Update resonance state
 */
export const updateResonance = async (
  resonanceId: string,
  updates: Partial<{
    revealStatus: ResonanceRevealStatus;
    songExchangeState: SongExchangeState;
  }>
): Promise<IResonanceDocument | null> => {
  const resonance = await Resonance.findByIdAndUpdate(
    resonanceId,
    { ...updates, lastActivityAt: new Date() },
    { new: true }
  );

  if (!resonance) {
    throw new ResonanceNotFoundError('Resonance not found');
  }

  // Emit update event (optional - can be expanded later)
  return resonance;
};
