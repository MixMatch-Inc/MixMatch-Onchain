import type { Request, Response } from 'express';
import { getResonancesForUser, updateResonance } from './resonance.service';
import { ResonanceRevealStatus, SongExchangeState } from './resonance.model';

const serializeResonance = (
  userId: string,
  resonance: any,
) => ({
  id: String(resonance._id ?? ''),
  counterpartUserId:
    String(resonance.userA) === userId
      ? String(resonance.userB)
      : String(resonance.userA),
  status: resonance.status,
  revealStatus: resonance.revealStatus,
  songExchangeState: resonance.songExchangeState,
  lastActivityAt: resonance.lastActivityAt,
  createdAt: resonance.createdAt,
  updatedAt: resonance.updatedAt,
});

export const listResonances = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized: missing or invalid token' });
    return;
  }

  try {
    const resonances = await getResonancesForUser(req.user.userId);
    res.status(200).json({
      items: resonances.map((resonance) => serializeResonance(req.user!.userId, resonance)),
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const patchResonance = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const { resonanceId } = req.params;
    const { revealStatus, songExchangeState } = req.body;

    const resonance = await updateResonance(resonanceId, {
      revealStatus: revealStatus as ResonanceRevealStatus,
      songExchangeState: songExchangeState as SongExchangeState,
    });

    res.status(200).json({
      resonance: serializeResonance(req.user.userId, resonance),
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};
