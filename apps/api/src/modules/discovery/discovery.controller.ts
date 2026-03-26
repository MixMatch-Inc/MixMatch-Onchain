import { Request, Response } from 'express';
import DjProfile from '../profiles/dj.model';
import User from '../users/user.model';
import { djDiscoveryQuerySchema } from './discovery.validation';

export const listDjs = async (req: Request, res: Response): Promise<void> => {
  const parsedQuery = djDiscoveryQuerySchema.safeParse(req.query);

  if (!parsedQuery.success) {
    res.status(400).json({
      message: 'Validation failed',
      errors: parsedQuery.error.flatten(),
    });
    return;
  }

  const { q, genre, availabilityStatus, minPrice, maxPrice, page, pageSize } =
    parsedQuery.data;

  const filters: Record<string, unknown> = {};

  if (genre) {
    filters.genres = genre;
  }

  if (availabilityStatus) {
    filters.availabilityStatus = availabilityStatus;
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    filters['pricing.min'] = {};

    if (minPrice !== undefined) {
      (filters['pricing.min'] as Record<string, number>).$gte = minPrice;
    }

    if (maxPrice !== undefined) {
      filters['pricing.max'] = { $lte: maxPrice };
    }
  }

  if (q) {
    filters.$or = [
      { stageName: { $regex: q, $options: 'i' } },
      { bio: { $regex: q, $options: 'i' } },
      { vibeTags: { $elemMatch: { $regex: q, $options: 'i' } } },
    ];
  }

  try {
    const [profiles, total] = await Promise.all([
      DjProfile.find(filters)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      DjProfile.countDocuments(filters),
    ]);

    const userIds = profiles.map((profile) => profile.user);
    const users = await User.find({
      _id: { $in: userIds },
      onboardingCompleted: true,
    })
      .select('_id onboardingCompleted')
      .lean();

    const allowedUserIds = new Set(users.map((user) => String(user._id)));
    const items = profiles
      .filter((profile) => allowedUserIds.has(String(profile.user)))
      .map((profile) => ({
        id: String(profile._id),
        stageName: profile.stageName,
        bio: profile.bio,
        genres: profile.genres,
        vibeTags: profile.vibeTags,
        pricing: profile.pricing,
        location: profile.location,
        availabilityStatus: profile.availabilityStatus,
        socialLinks: profile.socialLinks,
      }));

    res.status(200).json({
      items,
      page,
      pageSize,
      total: items.length < total ? items.length : total,
    });
  } catch {
    res.status(500).json({ message: 'Internal server error' });
  }
};
