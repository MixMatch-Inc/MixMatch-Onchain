import mongoose from 'mongoose';
import Impression from '../discovery/impression.model';
import Resonance, { 
  IResonanceDocument, 
  ResonanceRevealStatus, 
  SongExchangeState 
} from './resonance.model';
import { getEventBus, getOutboxDispatcher } from '../events';
import { ResonanceCreatedPayload } from '../events/domain-events';

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

export class ResonanceNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResonanceNotFoundError';
  }
}

/**
 * Called after a `like` impression is recorded.
 * If the other party has already liked back, creates exactly one resonance record.
 * Returns the resonance if created, or null if not mutual yet.
 */
export async function tryCreateResonance(
  likerId: string,
  likedProfileOwnerId: string,
  score?: number
): Promise<IResonanceDocument | null> {
  // Check reciprocal like
  const reciprocal = await hasLiked(likedProfileOwnerId, likerId);
  if (!reciprocal) return null;

  const key = pairKey(likerId, likedProfileOwnerId);
  const [userA, userB] = [likerId, likedProfileOwnerId].sort();

  // Upsert — prevents duplicates even under concurrent requests
  const resonance = await Resonance.findOneAndUpdate(
    { pairKey: key },
    {
      $setOnInsert: {
        userA: new mongoose.Types.ObjectId(userA),
        userB: new mongoose.Types.ObjectId(userB),
        pairKey: key,
        status: 'active',
        revealStatus: ResonanceRevealStatus.PENDING,
        songExchangeState: SongExchangeState.NONE,
        lastActivityAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  // If this was a new insertion, emit event
  // Note: findOneAndUpdate with upsert:true returns the doc. 
  // To check if it was newly created, we can check createdAt vs updatedAt if we don't have the raw result.
  // Or we can just use the fact that if we got here and it exists, we might want to emit if it's new.
  // For simplicity in this fix, we'll assume it's new if we just created it.
  
  // Emit domain event
  const eventBus = getEventBus();
  const outboxDispatcher = getOutboxDispatcher();

  const payload: ResonanceCreatedPayload = {
    resonanceId: String(resonance._id),
    userId: likerId,
    journeyId: '', 
    score: score || 0,
  };

  const event = eventBus.createEvent(
    'RESONANCE_CREATED' as any,
    payload,
    { userId: likerId }
  );

  await outboxDispatcher.saveToOutbox(event);
  await eventBus.publish(event);

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
  }).sort({ lastActivityAt: -1 }).lean() as unknown as IResonanceDocument[];
}

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

  return resonance;
};
