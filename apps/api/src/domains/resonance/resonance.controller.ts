import type { Request, Response } from 'express';
import { getResonancesForUser } from './resonance.service';

const serializeResonance = (
  userId: string,
  resonance: Awaited<ReturnType<typeof getResonancesForUser>>[number],
) => ({
  id: String((resonance as { _id?: unknown })._id ?? ''),
  counterpartUserId:
    String(resonance.userA) === userId
      ? String(resonance.userB)
      : String(resonance.userA),
  status: resonance.status,
  revealInitialized: resonance.revealInitialized,
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
  } catch {
    res.status(500).json({ message: 'Internal server error' });
  }
};
