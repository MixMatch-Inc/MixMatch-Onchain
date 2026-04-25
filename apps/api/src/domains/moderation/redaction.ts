import { ModerationState } from '@mixmatch/types';

export interface WithModerationMeta {
  moderationState: ModerationState;
  [key: string]: unknown;
}

/** Returns true if the entity should be hidden from public surfaces */
export function isRedacted(entity: WithModerationMeta): boolean {
  return (
    entity.moderationState === ModerationState.BANNED ||
    entity.moderationState === ModerationState.RESTRICTED
  );
}

/** Masks sensitive string fields on a journey/profile for restricted entities */
export function redactJourney<T extends WithModerationMeta & { title: string; description?: string; slots?: unknown[] }>(
  journey: T,
): T {
  if (!isRedacted(journey)) return journey;
  return {
    ...journey,
    title: '[removed]',
    description: undefined,
    slots: [],
  };
}

/** Masks bio/stageName on a DJ profile for restricted entities */
export function redactDjProfile<T extends WithModerationMeta & { bio?: string; stageName: string }>(
  profile: T,
): T {
  if (!isRedacted(profile)) return profile;
  return {
    ...profile,
    stageName: '[removed]',
    bio: undefined,
  };
}
