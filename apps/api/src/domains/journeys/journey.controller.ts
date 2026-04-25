import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Journey, { JourneyVisibility } from './journey.model';
import { DjGenre } from '@mixmatch/types';
import { RevealService } from '../discovery/reveal.service';
import { RevealPhase } from '@mixmatch/types';

interface LeanJourney {
  _id: mongoose.Types.ObjectId;
  owner: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  genres: DjGenre[];
  vibeTags: string[];
  visibility: JourneyVisibility;
  privateNotes?: string;
  revealedTo: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const serializeOwnerView = (j: LeanJourney) => ({
  id: String(j._id),
  title: j.title,
  description: j.description,
  genres: j.genres,
  vibeTags: j.vibeTags,
  visibility: j.visibility,
  privateNotes: j.privateNotes,
  revealedTo: j.revealedTo.map(String),
  createdAt: j.createdAt,
  updatedAt: j.updatedAt,
});

const serializePublicView = (j: LeanJourney) => ({
  id: String(j._id),
  title: j.title,
  description: j.description,
  genres: j.genres,
  vibeTags: j.vibeTags,
  createdAt: j.createdAt,
});

const serializeBlindView = (j: LeanJourney) => ({
  id: String(j._id),
  genres: j.genres,
  vibeTags: j.vibeTags,
  createdAt: j.createdAt,
});

const serializeRevealedView = (j: LeanJourney, phase: RevealPhase) => {
  const base = serializeBlindView(j);
  if (RevealService.canViewName(phase)) {
    return { ...base, title: j.title, description: j.description };
  }
  return base;
};

/** GET /journeys/:id — viewer-aware single journey */
export const getJourney = async (req: Request, res: Response): Promise<void> => {
  try {
    const journey = await Journey.findById(req.params.id).lean() as LeanJourney | null;
    if (!journey) {
      res.status(404).json({ message: 'Journey not found' });
      return;
    }

    const viewerId = req.user!.userId;
    const isOwner = String(journey.owner) === viewerId;

    if (isOwner) {
      res.status(200).json({ journey: serializeOwnerView(journey) });
      return;
    }

    if (journey.visibility !== JourneyVisibility.PUBLIC) {
      res.status(404).json({ message: 'Journey not found' });
      return;
    }

    const revealState = await RevealService.getRevealState(viewerId, String(journey.owner));
    const phase = revealState?.currentPhase ?? RevealPhase.BLIND;

    if (phase === RevealPhase.BLIND || phase === RevealPhase.BLOCKED) {
      res.status(200).json({ journey: serializeBlindView(journey) });
      return;
    }

    if (phase === RevealPhase.FULL || phase === RevealPhase.BASIC) {
      res.status(200).json({ journey: serializeRevealedView(journey, phase) });
      return;
    }

    res.status(200).json({ journey: serializePublicView(journey) });
  } catch {
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

/** GET /journeys/owner/me — owner's own journeys */
export const listOwnerJourneys = async (req: Request, res: Response): Promise<void> => {
  try {
    const journeys = await Journey.find({ owner: req.user!.userId })
      .sort({ createdAt: -1 })
      .lean() as LeanJourney[];

    res.status(200).json({ journeys: journeys.map(serializeOwnerView) });
  } catch {
    res.status(500).json({ message: 'Internal server error' });
  }
};

/** GET /journeys/public/:userId — public journeys for a user profile */
export const listPublicJourneys = async (req: Request, res: Response): Promise<void> => {
  try {
    const journeys = await Journey.find({
      owner: req.params.userId,
      visibility: JourneyVisibility.PUBLIC,
    })
      .sort({ createdAt: -1 })
      .lean() as LeanJourney[];

    res.status(200).json({ journeys: journeys.map(serializePublicView) });
  } catch {
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
