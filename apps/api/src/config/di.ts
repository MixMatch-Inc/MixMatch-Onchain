import {
  MongooseUserRepository,
  MongooseBookingRepository,
  MongooseVibeJourneyRepository,
  MongooseTrackReferenceRepository,
  MongooseEmailVerificationTokenRepository,
} from '../repositories';

// Simple dependency injection container
export const container = {
  userRepository: new MongooseUserRepository(),
  bookingRepository: new MongooseBookingRepository(),
  vibeJourneyRepository: new MongooseVibeJourneyRepository(),
  trackReferenceRepository: new MongooseTrackReferenceRepository(),
  emailVerificationTokenRepository: new MongooseEmailVerificationTokenRepository(),
};
