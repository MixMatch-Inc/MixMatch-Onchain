import { FeatureFlag } from './flags';
import { FlagContext, StaticFlagProvider } from './provider';

export function useFeatureFlag(flag: FeatureFlag, context?: FlagContext) {
  const flagProvider = getFlagProvider();
  
  return {
    isEnabled: flagProvider.isEnabled(flag, context),
    definition: flagProvider.getFlagDefinition(flag)
  };
}

export function useFeatureFlags(context?: FlagContext) {
  const flagProvider = getFlagProvider();
  
  return {
    flags: flagProvider.getFlags(context),
    isEnabled: (flag: FeatureFlag) => flagProvider.isEnabled(flag, context),
    getDefinition: (flag: FeatureFlag) => flagProvider.getFlagDefinition(flag)
  };
}

export function useRouteGuard(flag: FeatureFlag, context?: FlagContext) {
  const { isEnabled } = useFeatureFlag(flag, context);
  
  return {
    canAccess: isEnabled,
    redirectPath: getRedirectPath(flag)
  };
}

export function useComponentGate(flag: FeatureFlag, context?: FlagContext) {
  const { isEnabled, definition } = useFeatureFlag(flag, context);
  
  return {
    shouldRender: isEnabled,
    definition,
    renderWithFallback: (children: any, fallback?: any) => 
      isEnabled ? children : fallback
  };
}

let flagProviderInstance: any = null;

function getFlagProvider() {
  if (!flagProviderInstance) {
    flagProviderInstance = createDefaultFlagProvider();
  }
  return flagProviderInstance;
}

function createDefaultFlagProvider() {
  return new StaticFlagProvider(getEnvironmentFlags());
}

function getEnvironmentFlags() {
  if (typeof window !== 'undefined') {
    const envFlags = window.__MIXMATCH_FLAGS__;
    return envFlags || {};
  }
  return {};
}

function getRedirectPath(flag: FeatureFlag): string {
  const redirectMap: Record<FeatureFlag, string> = {
    [FeatureFlag.BLIND_MODE]: '/discover',
    [FeatureFlag.EVENTS]: '/events-disabled',
    [FeatureFlag.WALLET]: '/wallet-unavailable',
    [FeatureFlag.COMPATIBILITY_EXPLANATIONS]: '/compatibility-disabled',
    [FeatureFlag.NEW_DISCOVERY]: '/discover',
    [FeatureFlag.ADVANCED_SEARCH]: '/search',
    [FeatureFlag.SOCIAL_FEATURES]: '/profile',
    [FeatureFlag.MUSIC_CATALOG]: '/music-unavailable',
    [FeatureFlag.REAL_TIME_CHAT]: '/messages',
    [FeatureFlag.ANALYTICS_DASHBOARD]: '/analytics-disabled'
  };
  
  return redirectMap[flag] || '/';
}

declare global {
  interface Window {
    __MIXMATCH_FLAGS__?: Record<string, boolean>;
  }
}
