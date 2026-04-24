import { FeatureFlag, DEFAULT_FLAGS } from './flags';
import { RemoteFlagConfig } from './provider';

export interface FeatureFlagConfig {
  environment: 'development' | 'staging' | 'production';
  flags?: Partial<Record<FeatureFlag, boolean>>;
  remoteConfig?: RemoteFlagConfig;
  enableRemoteOverrides?: boolean;
}

export const DEVELOPMENT_CONFIG: FeatureFlagConfig = {
  environment: 'development',
  flags: {
    [FeatureFlag.BLIND_MODE]: true,
    [FeatureFlag.EVENTS]: true,
    [FeatureFlag.WALLET]: true,
    [FeatureFlag.COMPATIBILITY_EXPLANATIONS]: true,
    [FeatureFlag.NEW_DISCOVERY]: true,
    [FeatureFlag.ADVANCED_SEARCH]: true,
    [FeatureFlag.SOCIAL_FEATURES]: true,
    [FeatureFlag.MUSIC_CATALOG]: true,
    [FeatureFlag.REAL_TIME_CHAT]: true,
    [FeatureFlag.ANALYTICS_DASHBOARD]: true,
  },
  enableRemoteOverrides: true
};

export const STAGING_CONFIG: FeatureFlagConfig = {
  environment: 'staging',
  flags: {
    [FeatureFlag.BLIND_MODE]: true,
    [FeatureFlag.EVENTS]: true,
    [FeatureFlag.WALLET]: false,
    [FeatureFlag.COMPATIBILITY_EXPLANATIONS]: true,
    [FeatureFlag.NEW_DISCOVERY]: false,
    [FeatureFlag.ADVANCED_SEARCH]: false,
    [FeatureFlag.SOCIAL_FEATURES]: true,
    [FeatureFlag.MUSIC_CATALOG]: false,
    [FeatureFlag.REAL_TIME_CHAT]: false,
    [FeatureFlag.ANALYTICS_DASHBOARD]: false,
  },
  enableRemoteOverrides: true
};

export const PRODUCTION_CONFIG: FeatureFlagConfig = {
  environment: 'production',
  flags: {
    [FeatureFlag.BLIND_MODE]: false,
    [FeatureFlag.EVENTS]: true,
    [FeatureFlag.WALLET]: false,
    [FeatureFlag.COMPATIBILITY_EXPLANATIONS]: true,
    [FeatureFlag.NEW_DISCOVERY]: false,
    [FeatureFlag.ADVANCED_SEARCH]: false,
    [FeatureFlag.SOCIAL_FEATURES]: true,
    [FeatureFlag.MUSIC_CATALOG]: false,
    [FeatureFlag.REAL_TIME_CHAT]: false,
    [FeatureFlag.ANALYTICS_DASHBOARD]: false,
  },
  enableRemoteOverrides: false
};

export function getConfigForEnvironment(environment: string): FeatureFlagConfig {
  switch (environment) {
    case 'development':
      return DEVELOPMENT_CONFIG;
    case 'staging':
      return STAGING_CONFIG;
    case 'production':
      return PRODUCTION_CONFIG;
    default:
      return DEVELOPMENT_CONFIG;
  }
}

export function mergeConfigs(base: FeatureFlagConfig, override: Partial<FeatureFlagConfig>): FeatureFlagConfig {
  return {
    ...base,
    ...override,
    flags: { ...base.flags, ...override.flags },
    remoteConfig: base.remoteConfig && override.remoteConfig 
      ? { ...base.remoteConfig, ...override.remoteConfig }
      : base.remoteConfig || override.remoteConfig
  };
}

export function validateConfig(config: FeatureFlagConfig): boolean {
  if (!config.environment) return false;
  
  if (config.flags) {
    for (const flag of Object.keys(config.flags)) {
      if (!Object.values(FeatureFlag).includes(flag as FeatureFlag)) {
        return false;
      }
    }
  }
  
  return true;
}
