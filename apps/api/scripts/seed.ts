import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { AvailabilityStatus, DjGenre, EventType, UserRole } from '@mixmatch/types';
import connectDB from '../src/config/db';
import User from '../src/modules/users/user.model';
import DjProfile from '../src/modules/profiles/dj.model';
import PlannerProfile from '../src/modules/profiles/planner.model';
import LoverProfile from '../src/modules/profiles/lover.model';

dotenv.config();

const password = 'mixmatch123';

const seed = async () => {
  await connectDB();

  const passwordHash = await bcrypt.hash(password, 10);

  const [djUser, plannerUser, fanUser] = await Promise.all([
    User.findOneAndUpdate(
      { email: 'dj.demo@mixmatch.io' },
      {
        name: 'Demo DJ',
        email: 'dj.demo@mixmatch.io',
        passwordHash,
        role: UserRole.DJ,
        onboardingCompleted: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ),
    User.findOneAndUpdate(
      { email: 'planner.demo@mixmatch.io' },
      {
        name: 'Demo Planner',
        email: 'planner.demo@mixmatch.io',
        passwordHash,
        role: UserRole.PLANNER,
        onboardingCompleted: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ),
    User.findOneAndUpdate(
      { email: 'fan.demo@mixmatch.io' },
      {
        name: 'Demo Fan',
        email: 'fan.demo@mixmatch.io',
        passwordHash,
        role: UserRole.MUSIC_LOVER,
        onboardingCompleted: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ),
  ]);

  await Promise.all([
    DjProfile.findOneAndUpdate(
      { user: djUser._id },
      {
        user: djUser._id,
        stageName: 'DJ Demo',
        bio: 'Open-format DJ available for clubs, weddings, and private events.',
        genres: [DjGenre.AFROBEATS, DjGenre.AMAPIANO, DjGenre.HOUSE],
        vibeTags: ['high-energy', 'sunset', 'festival'],
        pricing: { min: 500, max: 1500 },
        availabilityStatus: AvailabilityStatus.AVAILABLE,
        socialLinks: {
          instagram: 'https://instagram.com/djdemo',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ),
    PlannerProfile.findOneAndUpdate(
      { user: plannerUser._id },
      {
        user: plannerUser._id,
        organizationName: 'Demo Events Co',
        typicalEventTypes: [EventType.CLUB, EventType.FESTIVAL, EventType.WEDDING],
        website: 'https://example.com/demo-events',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ),
    LoverProfile.findOneAndUpdate(
      { user: fanUser._id },
      {
        user: fanUser._id,
        favoriteGenres: [DjGenre.AFROBEATS, DjGenre.AMAPIANO],
        preferredVibes: ['dancefloor', 'late-night'],
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ),
  ]);

  console.log('Seed complete');
  console.log('Demo credentials:');
  console.log('  DJ: dj.demo@mixmatch.io / mixmatch123');
  console.log('  Planner: planner.demo@mixmatch.io / mixmatch123');
  console.log('  Fan: fan.demo@mixmatch.io / mixmatch123');

  await mongoose.disconnect();
};

void seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
