import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OnboardingProgress } from '@mixmatch/shared';
import { ONBOARDING_STEPS } from '@mixmatch/shared';

export const ONBOARDING_STORAGE_KEY = 'mixmatch.onboarding';

export async function loadOnboardingProgress(): Promise<OnboardingProgress | null> {
  const raw = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OnboardingProgress;
  } catch {
    await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
    return null;
  }
}

export async function saveOnboardingProgress(progress: OnboardingProgress): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(progress));
}

export async function isOnboardingComplete(): Promise<boolean> {
  const progress = await loadOnboardingProgress();
  return Boolean(progress?.skipped || progress?.completed.length === ONBOARDING_STEPS.length);
}

export async function completeOnboardingStep(step: OnboardingProgress['completed'][number]): Promise<void> {
  const current = (await loadOnboardingProgress()) ?? {
    completed: [],
    skipped: false,
    updatedAt: new Date().toISOString(),
  };
  await saveOnboardingProgress({
    ...current,
    completed: Array.from(new Set([...current.completed, step])),
    updatedAt: new Date().toISOString(),
  });
}

export async function skipOnboarding(): Promise<void> {
  const current = (await loadOnboardingProgress()) ?? { completed: [], skipped: false, updatedAt: '' };
  await saveOnboardingProgress({ ...current, skipped: true, updatedAt: new Date().toISOString() });
}
