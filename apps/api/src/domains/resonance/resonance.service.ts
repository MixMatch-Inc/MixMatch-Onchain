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
