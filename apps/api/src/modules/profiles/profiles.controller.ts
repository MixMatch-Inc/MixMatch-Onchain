import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { UserRole } from '@mixmatch/types';
import DjProfile from './dj.model';
import LoverProfile from './lover.model';
import PlannerProfile from './planner.model';
import User from '../users/user.model';
import { createProfileSchema } from './profiles.validation';

const serializeDocument = <T extends { _id?: unknown; id?: string }>(
  document: T,
) => {
  return {
    ...document,
    id: document.id,
  };
};

export const createProfile = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized: missing or invalid token' });
    return;
  }

  const parsedPayload = createProfileSchema.safeParse(req.body);

  if (!parsedPayload.success) {
    res.status(400).json({
      message: 'Validation failed',
      errors: parsedPayload.error.flatten(),
    });
    return;
  }

  if (parsedPayload.data.role !== req.user.role) {
    res.status(403).json({ message: 'Forbidden: role does not match authenticated user' });
    return;
  }

  const userId = new mongoose.Types.ObjectId(req.user.userId);

  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    let createdProfile;

    switch (parsedPayload.data.role) {
      case UserRole.DJ: {
        const existingProfile = await DjProfile.findOne({ user: userId }).lean();
        if (existingProfile) {
          res.status(409).json({ message: 'DJ profile already exists for this user' });
          return;
        }

        createdProfile = await DjProfile.create({
          user: userId,
          ...parsedPayload.data.profile,
          availabilityStatus:
            parsedPayload.data.profile.availabilityStatus ?? undefined,
        });
        break;
      }
      case UserRole.PLANNER: {
        const existingProfile = await PlannerProfile.findOne({ user: userId }).lean();
        if (existingProfile) {
          res.status(409).json({ message: 'Planner profile already exists for this user' });
          return;
        }

        createdProfile = await PlannerProfile.create({
          user: userId,
          ...parsedPayload.data.profile,
        });
        break;
      }
      case UserRole.MUSIC_LOVER: {
        const existingProfile = await LoverProfile.findOne({ user: userId }).lean();
        if (existingProfile) {
          res.status(409).json({ message: 'Music lover profile already exists for this user' });
          return;
        }

        createdProfile = await LoverProfile.create({
          user: userId,
          ...parsedPayload.data.profile,
        });
        break;
      }
      default:
        res.status(403).json({ message: 'Forbidden: unsupported role for profile creation' });
        return;
    }

    user.onboardingCompleted = true;
    await user.save();

    res.status(201).json({
      profile: serializeDocument(createdProfile.toObject()),
    });
  } catch (error) {
    const maybeMongoError = error as { code?: number };

    if (maybeMongoError.code === 11000) {
      res.status(409).json({ message: 'Profile already exists for this user' });
      return;
    }

    res.status(500).json({ message: 'Internal server error' });
  }
};
