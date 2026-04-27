import { MongooseUserRepository, MongooseBookingRepository, MongooseVibeJourneyRepository, MongooseTrackReferenceRepository, MongooseWalletLinkageRepository } from '../repositories';
import { MongoosePasswordResetTokenRepository } from '../repositories/adapters/mongoose-password-reset-token.repository';
import { MongooseEmailVerificationTokenRepository } from '../repositories/adapters/mongoose-email-verification-token.repository';
import { MongooseSessionRepository } from '../repositories/session.repository';

// Simple dependency injection container
export const container = {
  userRepository: new MongooseUserRepository(),
  bookingRepository: new MongooseBookingRepository(),
  vibeJourneyRepository: new MongooseVibeJourneyRepository(),
  trackReferenceRepository: new MongooseTrackReferenceRepository(),
  walletLinkageRepository: new MongooseWalletLinkageRepository(),
  passwordResetTokenRepository: new MongoosePasswordResetTokenRepository(),
  emailVerificationTokenRepository: new MongooseEmailVerificationTokenRepository(),
  sessionRepository: new MongooseSessionRepository(),
};
