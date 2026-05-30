import { userRepository } from "../repositories/user.repository.js";
import type { UserRecord } from "../repositories/user.repository.js";

interface Container {
  userRepository: typeof userRepository;
}

export const container: Container = {
  userRepository,
};
