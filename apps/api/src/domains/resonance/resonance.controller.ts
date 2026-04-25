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
import { Request, Response } from 'express';
import Resonance from './resonance.model';

export const listResonances = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Resonance.find({ userId })
        .sort({ lastActivityAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Resonance.countDocuments({ userId }),
    ]);

    res.status(200).json({
      items: items.map((r) => ({
        id: String(r._id),
        matchedUserId: String(r.matchedUserId),
        revealStatus: r.revealStatus,
        songExchangeState: r.songExchangeState,
        lastActivityAt: r.lastActivityAt,
        createdAt: r.createdAt,
      })),
      page,
      pageSize: limit,
      total,
    });
  } catch {
    res.status(500).json({ message: 'Internal server error' });
  }
};
