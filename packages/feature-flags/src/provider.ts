import { FeatureFlag, FlagDefinition, DEFAULT_FLAGS } from './flags';

export interface FlagProvider {
  isEnabled(flag: FeatureFlag, context?: FlagContext): boolean;
  getFlags(context?: FlagContext): Record<FeatureFlag, boolean>;
  getFlagDefinition(flag: FeatureFlag): FlagDefinition;
}

export interface FlagContext {
  userId?: string;
  role?: string;
  environment?: string;
  userAgent?: string;
  [key: string]: any;
}

export interface RemoteFlagConfig {
  flags: Partial<Record<FeatureFlag, boolean>>;
  overrides?: Record<string, boolean>;
  rolloutPercentages?: Partial<Record<FeatureFlag, number>>;
}

export class StaticFlagProvider implements FlagProvider {
  constructor(private flags: Partial<Record<FeatureFlag, boolean>> = {} as Partial<Record<FeatureFlag, boolean>>) {}

  isEnabled(flag: FeatureFlag, context?: FlagContext): boolean {
    return this.flags[flag] ?? DEFAULT_FLAGS[flag].defaultValue;
  }

  getFlags(context?: FlagContext): Record<FeatureFlag, boolean> {
    const result = {} as Record<FeatureFlag, boolean>;
    
    for (const flag of Object.values(FeatureFlag)) {
      result[flag] = this.isEnabled(flag, context);
    }
    
    return result;
  }

  getFlagDefinition(flag: FeatureFlag): FlagDefinition {
    return DEFAULT_FLAGS[flag];
  }
}

export class RemoteFlagProvider implements FlagProvider {
  constructor(
    private remoteConfig: RemoteFlagConfig,
    private fallbackProvider: FlagProvider = new StaticFlagProvider()
  ) {}

  isEnabled(flag: FeatureFlag, context?: FlagContext): boolean {
    if (this.remoteConfig.flags[flag] !== undefined) {
      return this.remoteConfig.flags[flag]!;
    }

    if (this.remoteConfig.rolloutPercentages?.[flag] && context?.userId) {
      const percentage = this.remoteConfig.rolloutPercentages[flag]!;
      const hash = this.hashUserId(context.userId);
      return hash < percentage;
    }

    if (this.remoteConfig.overrides && context) {
      const contextKey = `${context.role}_${context.environment}`;
      if (this.remoteConfig.overrides[contextKey] !== undefined) {
        return this.remoteConfig.overrides[contextKey];
      }
    }

    return this.fallbackProvider.isEnabled(flag, context);
  }

  getFlags(context?: FlagContext): Record<FeatureFlag, boolean> {
    const result: Record<FeatureFlag, boolean> = {} as any;
    
    for (const flag of Object.values(FeatureFlag)) {
      result[flag] = this.isEnabled(flag, context);
    }
    
    return result;
  }

  getFlagDefinition(flag: FeatureFlag): FlagDefinition {
    return DEFAULT_FLAGS[flag];
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash) % 100;
  }

  updateRemoteConfig(config: Partial<RemoteFlagConfig>): void {
    this.remoteConfig = { ...this.remoteConfig, ...config };
  }
}

export class CompositeFlagProvider implements FlagProvider {
  constructor(private providers: FlagProvider[]) {}

  isEnabled(flag: FeatureFlag, context?: FlagContext): boolean {
    for (const provider of this.providers) {
      if (provider.isEnabled(flag, context)) {
        return true;
      }
    }
    return false;
  }

  getFlags(context?: FlagContext): Record<FeatureFlag, boolean> {
    const result: Record<FeatureFlag, boolean> = {} as any;
    
    for (const flag of Object.values(FeatureFlag)) {
      result[flag] = this.isEnabled(flag, context);
    }
    
    return result;
  }

  getFlagDefinition(flag: FeatureFlag): FlagDefinition {
    return this.providers[0]?.getFlagDefinition(flag) ?? DEFAULT_FLAGS[flag];
  }
}
