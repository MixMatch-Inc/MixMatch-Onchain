import { MongooseUserRepository, MongooseBookingRepository, MongooseVibeJourneyRepository, MongooseTrackReferenceRepository, MongooseWalletLinkageRepository } from '../repositories';

// Simple dependency injection container
export const container = {
  userRepository: new MongooseUserRepository(),
  bookingRepository: new MongooseBookingRepository(),
  vibeJourneyRepository: new MongooseVibeJourneyRepository(),
  trackReferenceRepository: new MongooseTrackReferenceRepository(),
  walletLinkageRepository: new MongooseWalletLinkageRepository(),
};
