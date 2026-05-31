import type { AuthSession } from "@themixmatch/types";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24;

export function isSessionExpired(
  session: AuthSession,
): boolean {
  return (
    Date.now() >
    new Date(
      expiresAt,
    ).getTime()
  );
}