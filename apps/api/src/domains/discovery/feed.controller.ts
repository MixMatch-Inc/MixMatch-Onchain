import { Request, Response } from 'express';
import { z } from 'zod';
import { RevealPhase } from '@mixmatch/types';
import { DiscoveryCandidateService } from './candidate.service';
import { RevealService } from './reveal.service';
import { encodeCursor, decodeCursor, PaginationError, SortDirection } from '../../utils/pagination';

const feedQuerySchema = z.object({
  mode: z.enum(['standard', 'blind']).default('standard'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
});

const shapeCandidate = (candidate: Awaited<ReturnType<typeof DiscoveryCandidateService.getCandidates>>[number], mode: 'standard' | 'blind') => {
  const { profileId, djProfile, revealPhase } = candidate;

  const base = {
    profileId,
    genres: djProfile.genres,
    vibeTags: djProfile.vibeTags,
    availabilityStatus: djProfile.availabilityStatus,
    revealPhase,
    createdAt: djProfile.createdAt,
  };

  // Blind mode: always omit identity fields regardless of reveal phase
  if (mode === 'blind') {
    return base;
  }

  // Standard mode: apply reveal-phase redaction
  return {
    ...base,
    ...(RevealService.canViewName(revealPhase) ? { stageName: djProfile.stageName } : {}),
    ...(RevealService.canViewBio(revealPhase) ? { bio: djProfile.bio } : {}),
    ...(RevealService.canViewPricing(revealPhase) ? { pricing: djProfile.pricing } : {}),
    ...(RevealService.canViewLocation(revealPhase) ? { location: djProfile.location } : {}),
    ...(RevealService.canViewExternalLinks(revealPhase) ? { socialLinks: djProfile.socialLinks } : {}),
  };
};

export const getDiscoveryFeed = async (req: Request, res: Response): Promise<void> => {
  const parsed = feedQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    return;
  }

  const { mode, limit, cursor } = parsed.data;
  const viewerId = req.user!.userId;

  let afterId: string | undefined;
  if (cursor) {
    try {
      const decoded = decodeCursor(cursor);
      afterId = decoded.id;
    } catch (err) {
      if (err instanceof PaginationError) {
        res.status(400).json({ message: err.message, code: err.code });
        return;
      }
      res.status(400).json({ message: 'Invalid cursor' });
      return;
    }
  }

  try {
    // Fetch one extra to determine hasNextPage
    const candidates = await DiscoveryCandidateService.getCandidates({
      viewerId,
      surface: mode,
      limit: limit + 1,
      afterId,
    });

    const hasNextPage = candidates.length > limit;
    const page = hasNextPage ? candidates.slice(0, limit) : candidates;

    let nextCursor: string | undefined;
    if (hasNextPage && page.length > 0) {
      const last = page[page.length - 1];
      nextCursor = encodeCursor({
        field: '_id',
        value: last.profileId,
        direction: SortDirection.ASC,
        id: last.profileId,
      });
    }

    res.status(200).json({
      data: page.map((c) => shapeCandidate(c, mode)),
      hasNextPage,
      nextCursor,
    });
  } catch {
    res.status(500).json({ message: 'Internal server error' });
  }
};
