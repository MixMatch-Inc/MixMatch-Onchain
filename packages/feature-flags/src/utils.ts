import { FeatureFlag } from './flags';
import { FlagProvider, FlagContext, StaticFlagProvider } from './provider';

export function createFlagGuard(flag: FeatureFlag, provider?: FlagProvider) {
  return (context?: FlagContext) => {
    const flagProvider = provider || getGlobalFlagProvider();
    return flagProvider.isEnabled(flag, context);
  };
}

export function createConditionalRenderer(flag: FeatureFlag, provider?: FlagProvider) {
  return (children: any, fallback?: any, context?: FlagContext) => {
    const flagProvider = provider || getGlobalFlagProvider();
    const isEnabled = flagProvider.isEnabled(flag, context);
    return isEnabled ? children : fallback;
  };
}

export function createExperimentVariant(experimentName: string, variants: string[], provider?: FlagProvider) {
  return (context?: FlagContext): string => {
    const flagProvider = provider || getGlobalFlagProvider();
    
    const experimentFlag = `${experimentName}_experiment` as FeatureFlag;
    if (!flagProvider.isEnabled(experimentFlag, context)) {
      return variants[0];
    }

    const userId = context?.userId || 'anonymous';
    const hash = hashString(userId + experimentName);
    const variantIndex = hash % variants.length;
    
    return variants[variantIndex];
  };
}

export function validateFlagContext(context: any): context is FlagContext {
  return context && typeof context === 'object';
}

export function mergeFlagContexts(...contexts: (FlagContext | undefined)[]): FlagContext {
  return contexts.reduce((merged, context) => ({
    ...merged,
    ...(context || {})
  }), {} as FlagContext);
}

export function createFlagContext(overrides: Partial<FlagContext>): FlagContext {
  return {
    environment: typeof window !== 'undefined' ? 'browser' : 'server',
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
    ...overrides
  };
}

let globalFlagProvider: FlagProvider | null = null;

export function setGlobalFlagProvider(provider: FlagProvider): void {
  globalFlagProvider = provider;
}

export function getGlobalFlagProvider(): FlagProvider {
  if (!globalFlagProvider) {
    globalFlagProvider = createDefaultProvider();
  }
  return globalFlagProvider;
}

function createDefaultProvider(): FlagProvider {
  return new StaticFlagProvider(getEnvironmentFlags());
}

function getEnvironmentFlags(): Record<string, boolean> {
  if (typeof window !== 'undefined') {
    return window.__MIXMATCH_FLAGS__ || {};
  }
  
  if (typeof globalThis !== 'undefined' && (globalThis as any).process?.env) {
    const flags: Record<string, boolean> = {};
    for (const [key, value] of Object.entries((globalThis as any).process.env)) {
      if (key.startsWith('FF_')) {
        const flagName = key.substring(3).toLowerCase();
        flags[flagName] = value === 'true' || value === '1';
      }
    }
    return flags;
  }
  
  return {};
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

declare global {
  interface Window {
    __MIXMATCH_FLAGS__?: Record<string, boolean>;
  }
}
