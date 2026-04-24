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
