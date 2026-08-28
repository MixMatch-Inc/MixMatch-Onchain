import { validateEnv } from './env.validation';

const VALID_BASE: NodeJS.ProcessEnv = {
  JWT_SECRET: 'a'.repeat(32),
  WALLET_ENCRYPTION_KEY: 'ab'.repeat(32), // 64 hex chars
  DATABASE_URL: 'postgres://localhost/test',
};

describe('validateEnv', () => {
  describe('required fields', () => {
    it('throws when JWT_SECRET is missing', () => {
      const env = { ...VALID_BASE };
      delete env.JWT_SECRET;
      expect(() => validateEnv(env)).toThrow(/JWT_SECRET/);
    });

    it('throws when DATABASE_URL is missing', () => {
      const env = { ...VALID_BASE };
      delete env.DATABASE_URL;
      expect(() => validateEnv(env)).toThrow(/DATABASE_URL/);
    });

    it('throws when WALLET_ENCRYPTION_KEY is missing', () => {
      const env = { ...VALID_BASE };
      delete env.WALLET_ENCRYPTION_KEY;
      expect(() => validateEnv(env)).toThrow(/WALLET_ENCRYPTION_KEY/);
    });
  });

  describe('WALLET_ENCRYPTION_KEY hex format', () => {
    it('accepts a valid 64-character hex string', () => {
      expect(() => validateEnv(VALID_BASE)).not.toThrow();
    });

    it('rejects a key that is too short', () => {
      expect(() =>
        validateEnv({ ...VALID_BASE, WALLET_ENCRYPTION_KEY: 'ab'.repeat(16) }),
      ).toThrow(/WALLET_ENCRYPTION_KEY/);
    });

    it('rejects a key with non-hex characters', () => {
      expect(() =>
        validateEnv({ ...VALID_BASE, WALLET_ENCRYPTION_KEY: 'zz'.repeat(32) }),
      ).toThrow(/WALLET_ENCRYPTION_KEY/);
    });
  });

  describe('JWT_SECRET length in production', () => {
    it('throws when JWT_SECRET is shorter than 32 chars in production', () => {
      expect(() =>
        validateEnv({ ...VALID_BASE, NODE_ENV: 'production', JWT_SECRET: 'short' }),
      ).toThrow(/JWT_SECRET/);
    });

    it('allows a short JWT_SECRET in development', () => {
      expect(() =>
        validateEnv({ ...VALID_BASE, NODE_ENV: 'development', JWT_SECRET: 'short' }),
      ).not.toThrow();
    });
  });

  describe('ANCHOR_HOME_DOMAIN required in production (#906)', () => {
    it('throws when STELLAR_NETWORK=public and ANCHOR_HOME_DOMAIN is not set', () => {
      expect(() =>
        validateEnv({ ...VALID_BASE, STELLAR_NETWORK: 'public' }),
      ).toThrow(/ANCHOR_HOME_DOMAIN/);
    });

    it('accepts a production config with ANCHOR_HOME_DOMAIN set', () => {
      expect(() =>
        validateEnv({
          ...VALID_BASE,
          STELLAR_NETWORK: 'public',
          ANCHOR_HOME_DOMAIN: 'anchor.example.com',
        }),
      ).not.toThrow();
    });

    it('uses the testnet default when network is testnet and ANCHOR_HOME_DOMAIN is not set', () => {
      const config = validateEnv({ ...VALID_BASE, STELLAR_NETWORK: 'testnet' });
      expect(config.anchorHomeDomain).toBe('testanchor.stellar.org');
    });
  });

  describe('VAULT_ADDR / VAULT_TOKEN pairing', () => {
    it('throws when VAULT_ADDR is set but VAULT_TOKEN is missing', () => {
      expect(() =>
        validateEnv({ ...VALID_BASE, VAULT_ADDR: 'http://vault:8200' }),
      ).toThrow(/VAULT_TOKEN/);
    });

    it('accepts both VAULT_ADDR and VAULT_TOKEN together', () => {
      expect(() =>
        validateEnv({
          ...VALID_BASE,
          VAULT_ADDR: 'http://vault:8200',
          VAULT_TOKEN: 'root',
        }),
      ).not.toThrow();
    });
  });

  describe('defaults', () => {
    it('defaults port to 3000 when PORT is not set', () => {
      const config = validateEnv(VALID_BASE);
      expect(config.port).toBe(3000);
    });

    it('parses PORT when set', () => {
      const config = validateEnv({ ...VALID_BASE, PORT: '4000' });
      expect(config.port).toBe(4000);
    });

    it('defaults stellarNetwork to testnet when STELLAR_NETWORK is not set', () => {
      const config = validateEnv(VALID_BASE);
      expect(config.stellarNetwork).toBe('testnet');
    });
  });
});
