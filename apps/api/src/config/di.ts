import { MongooseUserRepository, MongooseBookingRepository, MongooseVibeJourneyRepository, MongooseTrackReferenceRepository } from '../repositories';

// Simple dependency injection container
export const container = {
  userRepository: new MongooseUserRepository(),
  bookingRepository: new MongooseBookingRepository(),
  vibeJourneyRepository: new MongooseVibeJourneyRepository(),
  trackReferenceRepository: new MongooseTrackReferenceRepository(),
};
