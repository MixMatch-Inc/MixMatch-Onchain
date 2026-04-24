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
