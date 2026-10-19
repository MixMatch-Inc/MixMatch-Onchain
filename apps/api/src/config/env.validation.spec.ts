import { validateEnv } from './env.validation';

const baseEnv: NodeJS.ProcessEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
  JWT_SECRET: 'test-secret-test-secret-test-secret-123',
  WALLET_ENCRYPTION_KEY: '0'.repeat(64),
};

describe('validateEnv STELLAR_NETWORK', () => {
  it('defaults to testnet when unset', () => {
    expect(validateEnv(baseEnv).stellarNetwork).toBe('testnet');
  });

  it('accepts public', () => {
    expect(validateEnv({ ...baseEnv, STELLAR_NETWORK: 'public' }).stellarNetwork).toBe('public');
  });

  it('throws on an unknown value instead of defaulting to testnet', () => {
    expect(() => validateEnv({ ...baseEnv, STELLAR_NETWORK: 'mainnet' })).toThrow(
      'Unknown STELLAR_NETWORK "mainnet". Valid values: testnet, public.',
    );
  });
});
