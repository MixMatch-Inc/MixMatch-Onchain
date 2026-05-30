import * as SecureStore from "expo-secure-store";

import type { AuthSession } from "@themixmatch/types";

const SESSION_KEY = "themixmatch.auth.session.v1";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isAuthSession = (value: unknown): value is AuthSession => {
  if (!isRecord(value)) return false;
  if (typeof value.token !== "string") return false;
  if (!isRecord(value.user)) return false;
  if (!isRecord(value.session)) return false;
  return true;
};

export async function loadAuthSession(): Promise<AuthSession | null> {
  const stored = await SecureStore.getItemAsync(SESSION_KEY);
  if (!stored) return null;

  try {
    const parsed: unknown = JSON.parse(stored);
    return isAuthSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveAuthSession(session: AuthSession): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function clearAuthSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
