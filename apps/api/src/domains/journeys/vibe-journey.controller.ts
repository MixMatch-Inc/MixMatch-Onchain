import { Request, Response } from 'express';
import { container } from '../../config/di';
import { CreateJourneyDto, UpdateJourneyDto, JourneyStatus } from '@mixmatch/types';

const serializeJourney = (journey: any) => ({
  id: journey.id,
  authorId: journey.authorId,
  title: journey.title,
  description: journey.description,
  status: journey.status,
  version: journey.version,
  publishedAt: journey.publishedAt,
  slots: journey.slots,
  createdAt: journey.createdAt,
  updatedAt: journey.updatedAt,
});

export const listJourneys = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const { status } = req.query;
    const journeys = await container.vibeJourneyRepository.findByAuthor(
      req.user.userId,
      status as JourneyStatus,
    );
    res.status(200).json({
      items: journeys.map(serializeJourney),
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getJourney = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { id } = req.params;

  try {
    const journey = await container.vibeJourneyRepository.findById(id);
    if (!journey) {
      res.status(404).json({ message: 'Journey not found' });
      return;
    }
    // Check if user is author or it's published
    if (journey.authorId !== req.user.userId && journey.status !== JourneyStatus.PUBLISHED) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }
    res.status(200).json(serializeJourney(journey));
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createJourney = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const data: CreateJourneyDto = req.body;

  try {
    const journey = await container.vibeJourneyRepository.create({
      ...data,
      authorId: req.user.userId,
    });
    res.status(201).json(serializeJourney(journey));
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateJourney = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { id } = req.params;
  const data: UpdateJourneyDto = req.body;

  try {
    const journey = await container.vibeJourneyRepository.updateDraft(id, data);
    if (!journey) {
      res.status(404).json({ message: 'Journey not found or not a draft' });
      return;
    }
    res.status(200).json(serializeJourney(journey));
  } catch (error) {
    if (error.message.includes('Cannot update published')) {
      res.status(403).json({ message: 'Cannot update published journey' });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

export const publishJourney = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { id } = req.params;

  try {
    const journey = await container.vibeJourneyRepository.publish(id);
    if (!journey) {
      res.status(404).json({ message: 'Journey not found' });
      return;
    }
    res.status(200).json(serializeJourney(journey));
  } catch (error) {
    if (error.message.includes('already published')) {
      res.status(400).json({ message: 'Journey is already published' });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

export const deleteJourney = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { id } = req.params;

  try {
    const deleted = await container.vibeJourneyRepository.delete(id);
    if (!deleted) {
      res.status(404).json({ message: 'Journey not found' });
      return;
    }
    res.status(204).send();
  } catch (error) {
    if (error.message.includes('Cannot delete published')) {
      res.status(403).json({ message: 'Cannot delete published journey' });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

export const listPublishedJourneys = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit } = req.query;
    const journeys = await container.vibeJourneyRepository.findLatestPublished(
      limit ? parseInt(limit as string) : 10,
    );
    res.status(200).json({
      items: journeys.map(serializeJourney),
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};