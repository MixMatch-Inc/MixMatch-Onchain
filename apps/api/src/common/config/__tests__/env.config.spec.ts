import { EnvConfig } from '../env.config';

describe('Issue #534: Env Config Validation Suite', () => {
  const backupEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    EnvConfig.clear();
    process.env.NODE_ENV = 'test';
    process.env.PORT = '4000';
    process.env.JWT_SECRET = 'SUPER_SECRET_COMPLIANT_STRING_32_CHARS_LONG';
    process.env.RPC_URL = 'https://soroban-testnet.stellar.org';
  });

  afterAll(() => {
    process.env = backupEnv;
  });

  it('should successfully parse valid environment variables into a strongly-typed object', () => {
    const config = EnvConfig.load();
    expect(config.PORT).toBe(4000);
    expect(config.STELLAR_NETWORK).toBe('testnet');
    expect(config.JWT_SECRET).toBeDefined();
  });

  it('should fail fast and throw an error if JWT_SECRET is missing or insecure', () => {
    process.env.JWT_SECRET = 'short-key';
    expect(() => EnvConfig.load()).toThrow('JWT_SECRET is missing or structurally insecure');
  });

  it('should fail fast if an explicit RPC endpoint is omitted from the injection pipeline', () => {
    delete process.env.RPC_URL;
    expect(() => EnvConfig.load()).toThrow('Stella/Soroban RPC_URL target must be explicitly provided.');
  });
});