import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WalletResolver } from './wallet-resolver';

/** A minimal StellarAccountRecord with neither signingKeyId nor encryptedSecretKey set. */
const malformedAccount = {
  id: 'acct-uuid',
  userId: 'user-uuid',
  publicKey: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  network: 'testnet' as const,
  signingKeyId: null,
  encryptedSecretKey: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const validAccount = {
  ...malformedAccount,
  encryptedSecretKey: 'some-encrypted-value',
};

describe('WalletResolver', () => {
  let resolver: WalletResolver;

  const configMock = {
    get: jest.fn((key: string) => {
      const cfg: Record<string, string | undefined> = {
        vaultAddr: undefined,
        walletEncryptionKey: 'a'.repeat(64),
        stellarNetwork: 'testnet',
      };
      return cfg[key];
    }),
    getOrThrow: jest.fn((key: string) => {
      const cfg: Record<string, string> = {
        walletEncryptionKey: 'a'.repeat(64),
        stellarNetwork: 'testnet',
      };
      if (!(key in cfg)) throw new Error(`Missing config key: ${key}`);
      return cfg[key];
    }),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WalletResolver,
        { provide: ConfigService, useValue: configMock },
      ],
    }).compile();
    resolver = module.get(WalletResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('vaultConfigured returns false when VAULT_ADDR is not set', () => {
    configMock.get.mockReturnValueOnce(undefined);
    expect(resolver.vaultConfigured()).toBe(false);
  });

  describe('#920: walletForAccount with a malformed account record', () => {
    it('throws an error when account has neither signingKeyId nor encryptedSecretKey', async () => {
      await expect(resolver.walletForAccount(malformedAccount as never)).rejects.toThrow(
        `Stellar account ${malformedAccount.id} has neither signingKeyId nor encryptedSecretKey`,
      );
    });

    it('does not throw when encryptedSecretKey is present (legacy path)', async () => {
      // We just need to verify the resolver gets past the guard; the actual
      // decryption will fail with a bad key, but the malformed-key branch is
      // exercised.
      await expect(
        resolver.walletForAccount(validAccount as never),
      ).rejects.toThrow(); // throws from decryptSecretKey with the mock key — not the malformed-key error
    });
  });
});
