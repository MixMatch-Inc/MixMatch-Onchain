import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { AccountStatus, ModerationState, VisibilityPreference } from '@mixmatch/types';
import connectDB from '../src/config/db';
import User from '../src/modules/users/user.model';

dotenv.config();

const migrateUsers = async () => {
  await connectDB();

  console.log('Starting user migration...');

  // Update all existing users to have the new fields with defaults
  const result = await User.updateMany(
    {
      $or: [
        { accountStatus: { $exists: false } },
        { timezone: { $exists: false } },
        { locale: { $exists: false } },
        { visibilityPreference: { $exists: false } },
        { ageGatePassed: { $exists: false } },
        { moderationState: { $exists: false } },
        { privacySettings: { $exists: false } },
        { lastActiveAt: { $exists: false } },
      ],
    },
    {
      $set: {
        accountStatus: AccountStatus.ACTIVE,
        timezone: 'UTC',
        locale: 'en-US',
        visibilityPreference: VisibilityPreference.PUBLIC,
        ageGatePassed: false,
        moderationState: ModerationState.CLEAR,
        privacySettings: {
          blindListeningEligible: true,
          profileRevealAllowed: true,
          showOnlineStatus: true,
          allowDirectMessages: true,
          visibilityPreference: VisibilityPreference.PUBLIC,
        },
        lastActiveAt: new Date(),
      },
    }
  );

  console.log(`Migration completed. Updated ${result.modifiedCount} users.`);

  await mongoose.disconnect();
};

migrateUsers().catch(console.error);