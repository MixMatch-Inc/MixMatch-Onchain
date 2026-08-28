import { validateEnv } from './env.validation';

function buildEnv(
  overrides: Record<string, string | undefined> = {},
): NodeJS.ProcessEnv {
  return {
    DATABASE_URL: 'postgres://localhost/mixmatch',
    JWT_SECRET: 'a'.repeat(32),
    WALLET_ENCRYPTION_KEY: 'b'.repeat(64),
    ...overrides,
  };
}

describe('validateEnv', () => {
  it('applies the default values for optional settings', () => {
    const env = validateEnv(buildEnv());

    expect(env.port).toBe(3000);
    expect(env.bcryptSaltRounds).toBe(10);
    expect(env.anchorHomeDomain).toBe('testanchor.stellar.org');
  });

  it('parses explicit bcrypt salt rounds and anchor home domain', () => {
    const env = validateEnv(
      buildEnv({
        BCRYPT_SALT_ROUNDS: '12',
        ANCHOR_HOME_DOMAIN: 'anchor.example.com',
      }),
    );

    expect(env.bcryptSaltRounds).toBe(12);
    expect(env.anchorHomeDomain).toBe('anchor.example.com');
  });

  it('requires an explicit anchor home domain in production', () => {
    expect(() =>
      validateEnv(buildEnv({ NODE_ENV: 'production' })),
    ).toThrow('ANCHOR_HOME_DOMAIN is required in production');
  });
});
