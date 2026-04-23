import { Request, Response } from 'express';
import { IDjProfileDocument } from '../profiles/dj.model';
import DjProfile from '../profiles/dj.model';
import User from '../users/user.model';
import {
  PaginationOptions,
  PaginatedResponse,
  buildPaginationQuery,
  createPaginatedResponse,
  encodeCursor,
  SortDirection,
  PaginationError,
} from '../../utils/pagination';
import { RevealService } from '../profiles/reveal.service';

const serializeDj = (
  profile: Pick<
    IDjProfileDocument,
    | '_id'
    | 'stageName'
    | 'bio'
    | 'genres'
    | 'vibeTags'
    | 'pricing'
    | 'location'
    | 'availabilityStatus'
    | 'socialLinks'
    | 'createdAt'
  >,
) => ({
  id: String(profile._id),
  stageName: profile.stageName,
  bio: profile.bio,
  genres: profile.genres,
  vibeTags: profile.vibeTags,
  pricing: profile.pricing,
  location: profile.location,
  availabilityStatus: profile.availabilityStatus,
  socialLinks: profile.socialLinks,
  createdAt: profile.createdAt,
});

export const getDjProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const profile = await DjProfile.findById(req.params.id).lean();

    if (!profile) {
      res.status(404).json({ message: 'DJ profile not found' });
      return;
    }

    const owner = await User.findById(profile.user).select('onboardingCompleted').lean();

    if (!owner?.onboardingCompleted) {
      res.status(404).json({ message: 'DJ profile not found' });
      return;
    }

    res.status(200).json({
      profile: serializeDj(profile),
    });
  } catch {
    res.status(404).json({ message: 'DJ profile not found' });
  }
};

export const listDjs = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const cursor = req.query.cursor as string | undefined;
    const direction = (req.query.direction as SortDirection) || SortDirection.DESC;

    const options: PaginationOptions = { limit, cursor, direction };

    const { query, sort, limit: queryLimit } = buildPaginationQuery(options, 'createdAt', direction);

    // Find DJ profiles with completed onboarding
    const profiles = await DjProfile.find(query)
      .populate('user', 'onboardingCompleted')
      .sort(sort)
      .limit(queryLimit)
      .lean();

    // Filter out profiles where user hasn't completed onboarding
    const filteredProfiles = profiles.filter(profile =>
      (profile.user as any)?.onboardingCompleted
    );

    // Get reveal states for each profile
    const viewerId = req.user!.userId;
    const revealStates = await Promise.all(
      filteredProfiles.map(profile =>
        RevealService.getRevealState(viewerId, profile._id.toString())
      )
    );

    // Redact profiles based on reveal state
    const redactedProfiles = filteredProfiles.map((profile, index) => {
      const revealState = revealStates[index];
      const phase = revealState?.currentPhase || 'BLIND';
      return RevealService.redactProfile(serializeDj(profile), phase);
    });

    const paginatedResponse = createPaginatedResponse(
      redactedProfiles,
      options,
      (profile) => ({
        field: 'createdAt',
        value: profile.createdAt,
        direction,
        id: profile.id,
      })
    );

    res.status(200).json(paginatedResponse);
  } catch (error) {
    if (error instanceof PaginationError) {
      res.status(400).json({ message: error.message, code: error.code });
      return;
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};
