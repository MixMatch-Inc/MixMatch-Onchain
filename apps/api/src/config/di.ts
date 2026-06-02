import { userRepository } from "../repositories/user.repository.js";
import { refreshTokenRepository } from "../repositories/refresh-token.repository.js";
import { ownershipChallengeRepository } from "../repositories/ownership-challenge.repository.js";
import { recoveryGrantRepository } from "../repositories/recovery-grant.repository.js";

interface Container {
  userRepository: typeof userRepository;
  refreshTokenRepository: typeof refreshTokenRepository;
  ownershipChallengeRepository: typeof ownershipChallengeRepository;
  recoveryGrantRepository: typeof recoveryGrantRepository;
}

export const container: Container = {
  userRepository,
  refreshTokenRepository,
  ownershipChallengeRepository,
  recoveryGrantRepository,
};
