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
import { updateProfileSchema } from './profiles.validation';

export const getCurrentProfile = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized: missing or invalid token' });
    return;
  }

  let profile;

  switch (req.user.role) {
    case UserRole.DJ:
      profile = await DjProfile.findOne({ user: req.user.userId }).lean();
      break;
    case UserRole.PLANNER:
      profile = await PlannerProfile.findOne({ user: req.user.userId }).lean();
      break;
    case UserRole.MUSIC_LOVER:
      profile = await LoverProfile.findOne({ user: req.user.userId }).lean();
      break;
    default:
      res.status(403).json({ message: 'Forbidden: unsupported role for profile access' });
      return;
  }

  if (!profile) {
    res.status(404).json({ message: 'Profile not found' });
    return;
  }

  res.status(200).json({ profile });
};

export const updateCurrentProfile = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized: missing or invalid token' });
    return;
  }

  const parsedPayload = updateProfileSchema.safeParse(req.body);

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

  let profile;

  switch (req.user.role) {
    case UserRole.DJ:
      profile = await DjProfile.findOneAndUpdate(
        { user: req.user.userId },
        { $set: parsedPayload.data.profile },
        { new: true, runValidators: true },
      );
      break;
    case UserRole.PLANNER:
      profile = await PlannerProfile.findOneAndUpdate(
        { user: req.user.userId },
        { $set: parsedPayload.data.profile },
        { new: true, runValidators: true },
      );
      break;
    case UserRole.MUSIC_LOVER:
      profile = await LoverProfile.findOneAndUpdate(
        { user: req.user.userId },
        { $set: parsedPayload.data.profile },
        { new: true, runValidators: true },
      );
      break;
    default:
      res.status(403).json({ message: 'Forbidden: unsupported role for profile updates' });
      return;
  }

  if (!profile) {
    res.status(404).json({ message: 'Profile not found' });
    return;
  }

  res.status(200).json({ profile: profile.toObject() });
};
