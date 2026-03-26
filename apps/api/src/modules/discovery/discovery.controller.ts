import { Request, Response } from 'express';
import { IDjProfileDocument } from '../profiles/dj.model';
import DjProfile from '../profiles/dj.model';
import User from '../users/user.model';

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
