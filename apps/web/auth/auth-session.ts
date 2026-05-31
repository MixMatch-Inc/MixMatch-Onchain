import type { AuthSession } from "@themixmatch/types";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24;

export function isSessionExpired(
  session: AuthSession,
): boolean {
  const issuedAt = new Date(
    session.session.issuedAt,
  ).getTime();
  return Date.now() > issuedAt + SESSION_TTL_MS;
}
