export enum FeatureFlag {
  BLIND_MODE = 'blind_mode',
  EVENTS = 'events',
  WALLET = 'wallet',
  COMPATIBILITY_EXPLANATIONS = 'compatibility_explanations',
  NEW_DISCOVERY = 'new_discovery',
  ADVANCED_SEARCH = 'advanced_search',
  SOCIAL_FEATURES = 'social_features',
  MUSIC_CATALOG = 'music_catalog',
  REAL_TIME_CHAT = 'real_time_chat',
  ANALYTICS_DASHBOARD = 'analytics_dashboard',
}

export interface FlagDefinition {
  key: FeatureFlag;
  name: string;
  description: string;
  defaultValue: boolean;
  environments?: string[];
  rolloutPercentage?: number;
}

export const DEFAULT_FLAGS: Record<FeatureFlag, FlagDefinition> = {
  [FeatureFlag.BLIND_MODE]: {
    key: FeatureFlag.BLIND_MODE,
    name: 'Blind Mode',
    description: 'Enable blind listening mode for privacy',
    defaultValue: false,
    rolloutPercentage: 100
  },
  [FeatureFlag.EVENTS]: {
    key: FeatureFlag.EVENTS,
    name: 'Events',
    description: 'Show events and booking features',
    defaultValue: true,
    rolloutPercentage: 100
  },
  [FeatureFlag.WALLET]: {
    key: FeatureFlag.WALLET,
    name: 'Wallet',
    description: 'Enable wallet and payment features',
    defaultValue: false,
    rolloutPercentage: 50
  },
  [FeatureFlag.COMPATIBILITY_EXPLANATIONS]: {
    key: FeatureFlag.COMPATIBILITY_EXPLANATIONS,
    name: 'Compatibility Explanations',
    description: 'Show compatibility explanations between users',
    defaultValue: true,
    rolloutPercentage: 100
  },
  [FeatureFlag.NEW_DISCOVERY]: {
    key: FeatureFlag.NEW_DISCOVERY,
    name: 'New Discovery',
    description: 'Enable new discovery algorithm',
    defaultValue: false,
    rolloutPercentage: 10
  },
  [FeatureFlag.ADVANCED_SEARCH]: {
    key: FeatureFlag.ADVANCED_SEARCH,
    name: 'Advanced Search',
    description: 'Enable advanced search filters',
    defaultValue: false,
    rolloutPercentage: 25
  },
  [FeatureFlag.SOCIAL_FEATURES]: {
    key: FeatureFlag.SOCIAL_FEATURES,
    name: 'Social Features',
    description: 'Enable social networking features',
    defaultValue: true,
    rolloutPercentage: 75
  },
  [FeatureFlag.MUSIC_CATALOG]: {
    key: FeatureFlag.MUSIC_CATALOG,
    name: 'Music Catalog',
    description: 'Enable music catalog integration',
    defaultValue: false,
    rolloutPercentage: 30
  },
  [FeatureFlag.REAL_TIME_CHAT]: {
    key: FeatureFlag.REAL_TIME_CHAT,
    name: 'Real-time Chat',
    description: 'Enable real-time messaging',
    defaultValue: false,
    rolloutPercentage: 20
  },
  [FeatureFlag.ANALYTICS_DASHBOARD]: {
    key: FeatureFlag.ANALYTICS_DASHBOARD,
    name: 'Analytics Dashboard',
    description: 'Show analytics dashboard for DJs',
    defaultValue: false,
    rolloutPercentage: 5
  }
};
