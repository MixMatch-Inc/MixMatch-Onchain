export type EnvVarType = 'string' | 'number' | 'url' | 'secret';

export interface EnvVarDefinition {
  name: string;
  type: EnvVarType;
  required: boolean;
  description: string;
  default?: string;
  secret?: boolean;
}

export interface ServiceManifest {
  serviceName: string;
  envFile: string;
  variables: EnvVarDefinition[];
}

export const apiManifest: ServiceManifest = {
  serviceName: 'api',
  envFile: 'apps/api/.env',
  variables: [
    {
      name: 'PORT',
      type: 'number',
      required: false,
      description: 'Port number for the API server',
      default: '3001',
    },
    {
      name: 'MONGO_URI',
      type: 'url',
      required: true,
      description: 'MongoDB connection string',
    },
    {
      name: 'JWT_SECRET',
      type: 'secret',
      required: true,
      description: 'Secret key for JWT token signing',
      secret: true,
    },
    {
      name: 'CORS_ORIGIN',
      type: 'url',
      required: false,
      description: 'Allowed CORS origin',
      default: 'http://localhost:3000',
    },
  ],
};

export const webManifest: ServiceManifest = {
  serviceName: 'web',
  envFile: 'apps/web/.env.local',
  variables: [
    {
      name: 'NEXT_PUBLIC_API_URL',
      type: 'url',
      required: true,
      description: 'Backend API URL (exposed to browser)',
    },
  ],
};

export const stellarManifest: ServiceManifest = {
  serviceName: 'stellar-service',
  envFile: 'apps/stellar-service/.env',
  variables: [
    {
      name: 'PORT',
      type: 'number',
      required: false,
      description: 'Port number for the Stellar service',
      default: '3002',
    },
    {
      name: 'STELLAR_NETWORK',
      type: 'string',
      required: false,
      description: 'Stellar network (TESTNET or PUBLIC)',
      default: 'TESTNET',
    },
    {
      name: 'STELLAR_HORIZON_URL',
      type: 'url',
      required: false,
      description: 'Stellar Horizon API URL',
      default: 'https://horizon-testnet.stellar.org',
    },
    {
      name: 'STELLAR_SEC_KEY',
      type: 'secret',
      required: true,
      description: 'Stellar account secret key',
      secret: true,
    },
    {
      name: 'TREASURY_PUB_KEY',
      type: 'string',
      required: false,
      description: 'Treasury account public key',
    },
    {
      name: 'PLATFORM_FEE_PERCENT',
      type: 'number',
      required: false,
      description: 'Platform fee percentage',
      default: '0.1',
    },
  ],
};

export const allManifests: ServiceManifest[] = [
  apiManifest,
  webManifest,
  stellarManifest,
];
