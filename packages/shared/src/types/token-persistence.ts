/**
 * Token Persistence — Scope & Contracts
 *
 * Track: token persistence | me endpoint  |  Sprint 1
 *
 * Defines the TypeScript interfaces that describe how authentication
 * tokens are persisted on the client, hydrated on page load, and
 * validated against the server via GET /api/auth/me.
 */

import type { AuthUser } from "./auth.js";

// ---------------------------------------------------------------------------
// Storage contract
// ---------------------------------------------------------------------------

/** The shape written to / read from localStorage under "mixmatch.auth". */
export interface PersistedAuthState {
  user: AuthUser;
  accessToken: string;
}

/** Storage key used by AuthProvider. Must never change without a migration. */
export const PERSISTED_AUTH_KEY = "mixmatch.auth" as const;

// ---------------------------------------------------------------------------
// Hydration contract
// ---------------------------------------------------------------------------

/** Result returned by AuthProvider after attempting to rehydrate from storage. */
export type HydrationResult =
  | { status: "restored"; state: PersistedAuthState }
  | { status: "empty" }
  | { status: "corrupt"; reason: string };

/**
 * Attempts to parse a raw localStorage value into `PersistedAuthState`.
 * Returns a discriminated union so callers handle every case explicitly.
 */
export function parsePersistedAuth(raw: string | null): HydrationResult {
  if (raw === null) return { status: "empty" };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "user" in parsed &&
      "accessToken" in parsed &&
      typeof (parsed as Record<string, unknown>).accessToken === "string"
    ) {
      return { status: "restored", state: parsed as PersistedAuthState };
    }
    return { status: "corrupt", reason: "missing required fields" };
  } catch {
    return { status: "corrupt", reason: "invalid JSON" };
  }
}

// ---------------------------------------------------------------------------
// Me-endpoint integration contract
// ---------------------------------------------------------------------------

/** Error codes returned by GET /api/auth/me */
export type MeEndpointErrorCode =
  | "INVALID_TOKEN"
  | "TOKEN_EXPIRED"
  | "NOT_FOUND";

/**
 * Edge cases that must be handled when rehydrating from storage and
 * validating the persisted token against the server:
 *
 * | Scenario                   | Expected behaviour                          |
 * |----------------------------|---------------------------------------------|
 * | localStorage empty         | Treat as logged-out; no /me call            |
 * | localStorage corrupt JSON  | Remove key; treat as logged-out             |
 * | /me returns 401            | Clear storage; redirect to /login           |
 * | /me returns 404            | Clear storage; redirect to /login           |
 * | /me returns 200            | Restore session; update user from response  |
 * | Multiple tabs              | Each tab hydrates independently             |
 */
export type TokenPersistenceEdgeCases = true; // marker — see apps/docs/token-persistence.md
