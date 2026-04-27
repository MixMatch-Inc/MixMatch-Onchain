import {
  MongooseUserRepository,
  MongooseBookingRepository,
  MongooseVibeJourneyRepository,
  MongooseTrackReferenceRepository,
  MongooseWalletLinkageRepository,
} from '../repositories';
import { MongooseSessionRepository } from '../repositories/session.repository';
import { MongooseEmailVerificationTokenRepository } from '../repositories/adapters/mongoose-email-verification-token.repository';

// Simple dependency injection container
export const container = {
  userRepository: new MongooseUserRepository(),
  bookingRepository: new MongooseBookingRepository(),
  vibeJourneyRepository: new MongooseVibeJourneyRepository(),
  trackReferenceRepository: new MongooseTrackReferenceRepository(),
  walletLinkageRepository: new MongooseWalletLinkageRepository(),
  sessionRepository: new MongooseSessionRepository(),
  emailVerificationTokenRepository: new MongooseEmailVerificationTokenRepository(),
};
