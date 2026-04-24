import mongoose from 'mongoose';
import VibeJourney, { IVibeJourneyDocument, IJourneySlot, JourneyStatus } from './vibe-journey.model';
import JourneySnapshot, { IJourneySnapshotDocument } from './journey-snapshot.model';

export const findDraftByAuthor = (authorId: string): Promise<IVibeJourneyDocument | null> =>
  VibeJourney.findOne({ author: authorId, status: JourneyStatus.DRAFT });

export const findJourneyById = (journeyId: string): Promise<IVibeJourneyDocument | null> =>
  VibeJourney.findById(journeyId);

export const createDraftJourney = (
  authorId: string,
  title: string,
  description?: string,
): Promise<IVibeJourneyDocument> =>
  VibeJourney.create({ author: authorId, title, description });

export const updateJourneySlots = (
  journeyId: string,
  slots: IJourneySlot[],
  currentVersion: number,
): Promise<IVibeJourneyDocument | null> =>
  VibeJourney.findOneAndUpdate(
    { _id: journeyId, status: JourneyStatus.DRAFT, version: currentVersion },
    { $set: { slots }, $inc: { version: 1 } },
    { new: true },
  );

export const findSnapshotByJourneyVersion = (
  journeyId: string,
  draftVersion: number,
): Promise<IJourneySnapshotDocument | null> =>
  JourneySnapshot.findOne({ journeyId, draftVersion });

export const createSnapshot = (data: {
  journeyId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  slots: IJourneySlot[];
  draftVersion: number;
}): Promise<IJourneySnapshotDocument> => JourneySnapshot.create(data);

export const publishJourney = (
  journeyId: string,
  snapshotId: mongoose.Types.ObjectId,
): Promise<IVibeJourneyDocument | null> =>
  VibeJourney.findByIdAndUpdate(
    journeyId,
    { $set: { status: JourneyStatus.PUBLISHED, latestPublishedSnapshotId: snapshotId } },
    { new: true },
  );
