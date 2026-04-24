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
