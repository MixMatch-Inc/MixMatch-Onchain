import { MongooseUserRepository, MongooseBookingRepository, MongooseVibeJourneyRepository, MongooseTrackReferenceRepository, MongooseSessionRepository } from '../repositories';

// Simple dependency injection container
export const container = {
  userRepository: new MongooseUserRepository(),
  bookingRepository: new MongooseBookingRepository(),
  vibeJourneyRepository: new MongooseVibeJourneyRepository(),
  trackReferenceRepository: new MongooseTrackReferenceRepository(),
  sessionRepository: new MongooseSessionRepository(),
};
