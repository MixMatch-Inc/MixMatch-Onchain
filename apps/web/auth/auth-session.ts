import type { AuthSession } from "@themixmatch/types";

export function isSessionExpired(session: AuthSession): boolean {
  const issued = new Date(session.session.issuedAt).getTime();
  const maxAgeMs = 24 * 60 * 60 * 1000; // 24 hours
  return Date.now() - issued > maxAgeMs;
}
