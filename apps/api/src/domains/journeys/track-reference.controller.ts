import { Request, Response } from 'express';
import { container } from '../../config/di';
import { CreateTrackReferenceDto, ProviderType } from '@mixmatch/types';

const serializeTrackReference = (track: any) => ({
  id: track.id,
  provider: track.provider,
  providerTrackId: track.providerTrackId,
  title: track.title,
  artists: track.artists,
  album: track.album,
  durationMs: track.durationMs,
  previewUrl: track.previewUrl,
  artwork: track.artwork,
  explicit: track.explicit,
  audioFeaturesCacheKey: track.audioFeaturesCacheKey,
  ingestedAt: track.ingestedAt,
  createdAt: track.createdAt,
  updatedAt: track.updatedAt,
});

export const getTrackReference = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const track = await container.trackReferenceRepository.findById(id);
    if (!track) {
      res.status(404).json({ message: 'Track reference not found' });
      return;
    }
    res.status(200).json(serializeTrackReference(track));
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createTrackReference = async (req: Request, res: Response): Promise<void> => {
  const dto: CreateTrackReferenceDto = req.body;

  try {
    const track = await container.trackReferenceRepository.upsert(dto);
    res.status(201).json(serializeTrackReference(track));
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const searchTrackReferences = async (req: Request, res: Response): Promise<void> => {
  const { q, limit } = req.query;

  if (!q || typeof q !== 'string') {
    res.status(400).json({ message: 'Query parameter q is required' });
    return;
  }

  try {
    const tracks = await container.trackReferenceRepository.search(q, limit ? parseInt(limit as string) : 10);
    res.status(200).json({
      items: tracks.map(serializeTrackReference),
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getRecentTrackReferences = async (req: Request, res: Response): Promise<void> => {
  const { limit } = req.query;

  try {
    const tracks = await container.trackReferenceRepository.findRecent(limit ? parseInt(limit as string) : 10);
    res.status(200).json({
      items: tracks.map(serializeTrackReference),
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTrackReferenceByProvider = async (req: Request, res: Response): Promise<void> => {
  const { provider, providerTrackId } = req.params;

  try {
    const track = await container.trackReferenceRepository.findByProviderAndId(provider as ProviderType, providerTrackId);
    if (!track) {
      res.status(404).json({ message: 'Track reference not found' });
      return;
    }
    res.status(200).json(serializeTrackReference(track));
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};