import { AuthError } from "./errors";

export function jwtUnauthorizedError(requestId?: string): AuthError {
  // We don't distinguish invalid vs expired at this boundary; clients handle both as session reset.
  return AuthError.tokenExpired(requestId);
}

