import { userRepository } from "../repositories/user.repository.js";
import { refreshTokenRepository } from "../repositories/refresh-token.repository.js";
import type { UserRecord } from "../repositories/user.repository.js";

interface Container {
  userRepository: typeof userRepository;
  refreshTokenRepository: typeof refreshTokenRepository;
}

export const container: Container = {
  userRepository,
  refreshTokenRepository,
};
