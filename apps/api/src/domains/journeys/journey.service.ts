import { IJourneySlot, JourneyStatus } from './vibe-journey.model';
import * as repo from './journey.repository';

export class JourneyConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JourneyConflictError';
  }
}

export class JourneyNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JourneyNotFoundError';
  }
}

export class JourneyForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JourneyForbiddenError';
  }
}

export class JourneyPublishError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JourneyPublishError';
  }
}

// Single active draft enforced per author — returns existing draft if one exists (idempotent)
export const createOrReturnDraft = async (
  authorId: string,
  title: string,
  description?: string,
) => {
  const existing = await repo.findDraftByAuthor(authorId);
  if (existing) {
    return { journey: existing, created: false };
  }
  const journey = await repo.createDraftJourney(authorId, title, description);
  return { journey, created: true };
};

export const updateSlots = async (
  journeyId: string,
  requestingUserId: string,
  slots: IJourneySlot[],
  version: number,
) => {
  const journey = await repo.findJourneyById(journeyId);

  if (!journey) {
    throw new JourneyNotFoundError('Journey not found');
  }

  if (journey.author.toString() !== requestingUserId) {
    throw new JourneyForbiddenError('Only the journey author can update slots');
  }

  if (journey.status !== JourneyStatus.DRAFT) {
    throw new JourneyConflictError('Only draft journeys can be updated');
  }

  const updated = await repo.updateJourneySlots(journeyId, slots, version);

  if (!updated) {
    // findOneAndUpdate matched nothing — version conflict
    throw new JourneyConflictError(
      'Version conflict: the journey has been modified since you last fetched it',
    );
  }

  return updated;
};

export const publishJourney = async (journeyId: string, requestingUserId: string) => {
  const journey = await repo.findJourneyById(journeyId);

  if (!journey) {
    throw new JourneyNotFoundError('Journey not found');
  }

  if (journey.author.toString() !== requestingUserId) {
    throw new JourneyForbiddenError('Only the journey author can publish it');
  }

  if (journey.status !== JourneyStatus.DRAFT) {
    throw new JourneyConflictError('Only draft journeys can be published');
  }

  if (journey.slots.length === 0) {
    throw new JourneyPublishError('Cannot publish a journey with no slots');
  }

  // Prevent duplicate snapshots for the same draft version
  const existingSnapshot = await repo.findSnapshotByJourneyVersion(journeyId, journey.version);
  if (existingSnapshot) {
    const published = await repo.publishJourney(journeyId, existingSnapshot._id as any);
    return { journey: published, snapshot: existingSnapshot, alreadyExists: true };
  }

  const snapshot = await repo.createSnapshot({
    journeyId: journey._id as any,
    authorId: journey.author as any,
    title: journey.title,
    description: journey.description,
    slots: journey.slots,
    draftVersion: journey.version,
  });

  const published = await repo.publishJourney(journeyId, snapshot._id as any);
  return { journey: published, snapshot, alreadyExists: false };
};

export const getJourney = async (journeyId: string, requestingUserId: string) => {
  const journey = await repo.findJourneyById(journeyId);

  if (!journey) {
    throw new JourneyNotFoundError('Journey not found');
  }

  if (journey.author.toString() !== requestingUserId && journey.status !== JourneyStatus.PUBLISHED) {
    throw new JourneyForbiddenError('Access denied');
  }

  return journey;
};
