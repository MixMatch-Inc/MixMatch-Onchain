import { Request, Response } from 'express';
import { createDraftJourneySchema, updateSlotsSchema } from './journey.validation';
import * as journeyService from './journey.service';
import { IVibeJourneyDocument } from './vibe-journey.model';
import { IJourneySnapshotDocument } from './journey-snapshot.model';

const serializeJourney = (journey: IVibeJourneyDocument) => ({
  id: String(journey._id),
  author: String(journey.author),
  title: journey.title,
  description: journey.description,
  status: journey.status,
  slots: journey.slots,
  version: journey.version,
  latestPublishedSnapshotId: journey.latestPublishedSnapshotId
    ? String(journey.latestPublishedSnapshotId)
    : undefined,
  createdAt: journey.createdAt,
  updatedAt: journey.updatedAt,
});

const serializeSnapshot = (snapshot: IJourneySnapshotDocument) => ({
  id: String(snapshot._id),
  journeyId: String(snapshot.journeyId),
  authorId: String(snapshot.authorId),
  title: snapshot.title,
  description: snapshot.description,
  slots: snapshot.slots,
  draftVersion: snapshot.draftVersion,
  createdAt: snapshot.createdAt,
});

export const createDraftJourney = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const parsed = createDraftJourneySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    return;
  }

  try {
    const { journey, created } = await journeyService.createOrReturnDraft(
      req.user.userId,
      parsed.data.title,
      parsed.data.description,
    );

    res.status(created ? 201 : 200).json({ journey: serializeJourney(journey) });
  } catch {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateJourneySlots = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const parsed = updateSlotsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    return;
  }

  try {
    const journey = await journeyService.updateSlots(
      req.params.journeyId,
      req.user.userId,
      parsed.data.slots,
      parsed.data.version,
    );

    res.status(200).json({ journey: serializeJourney(journey) });
  } catch (error) {
    if (error instanceof journeyService.JourneyNotFoundError) {
      res.status(404).json({ message: error.message });
      return;
    }
    if (error instanceof journeyService.JourneyForbiddenError) {
      res.status(403).json({ message: error.message });
      return;
    }
    if (error instanceof journeyService.JourneyConflictError) {
      res.status(409).json({ message: error.message });
      return;
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const publishJourney = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const { journey, snapshot } = await journeyService.publishJourney(
      req.params.journeyId,
      req.user.userId,
    );

    res.status(200).json({
      journey: serializeJourney(journey!),
      snapshot: serializeSnapshot(snapshot),
    });
  } catch (error) {
    if (error instanceof journeyService.JourneyNotFoundError) {
      res.status(404).json({ message: error.message });
      return;
    }
    if (error instanceof journeyService.JourneyForbiddenError) {
      res.status(403).json({ message: error.message });
      return;
    }
    if (error instanceof journeyService.JourneyConflictError) {
      res.status(409).json({ message: error.message });
      return;
    }
    if (error instanceof journeyService.JourneyPublishError) {
      res.status(422).json({ message: error.message });
      return;
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getJourney = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const journey = await journeyService.getJourney(req.params.journeyId, req.user.userId);
    res.status(200).json({ journey: serializeJourney(journey) });
  } catch (error) {
    if (error instanceof journeyService.JourneyNotFoundError) {
      res.status(404).json({ message: error.message });
      return;
    }
    if (error instanceof journeyService.JourneyForbiddenError) {
      res.status(403).json({ message: error.message });
      return;
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const archiveJourney = async (_req: Request, res: Response): Promise<void> => {
  res.status(501).json({ message: 'Archive endpoint not yet implemented' });
};
