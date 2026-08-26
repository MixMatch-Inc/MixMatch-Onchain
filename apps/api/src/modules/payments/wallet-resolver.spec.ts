import type { ConfigService } from '@nestjs/config';
import { Keypair } from '@stellar/stellar-sdk';
import { KeypairWallet, VaultWallet } from '@mixmatch/stellar';
import { encryptSecretKey } from './wallet-encryption';
import { WalletResolver } from './wallet-resolver';
import type { StellarAccountRecord } from './stellar-account.repository';

const createSigningKeyMock = jest.fn<Promise<void>, [string]>();
const getPublicKeyMock = jest.fn<Promise<Buffer>, [string]>();
const signMock = jest.fn<Promise<Buffer>, [string, Buffer]>();

jest.mock('@mixmatch/kms', () => ({
  VaultTransitClient: jest.fn().mockImplementation(() => ({
    createSigningKey: createSigningKeyMock,
    getPublicKey: getPublicKeyMock,
    sign: signMock,
  })),
}));

const ENCRYPTION_KEY = 'ab'.repeat(32);

function buildAccount(
  overrides: Partial<StellarAccountRecord> = {},
): StellarAccountRecord {
  return {
    id: 'account-1',
    userId: 'user-1',
    publicKey: 'GABCDEF',
    encryptedSecretKey: null,
    signingKeyId: null,
    network: 'testnet',
    multisigConfigured: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildConfigService(values: Record<string, unknown>): ConfigService {
  return {
    get: jest.fn((key: string) => values[key]),
    getOrThrow: jest.fn((key: string) => {
      if (values[key] === undefined) {
        throw new Error(`Missing config: ${key}`);
      }
      return values[key];
    }),
  } as unknown as ConfigService;
}

describe('WalletResolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('without Vault configured', () => {
    it('resolves a legacy account via KeypairWallet', async () => {
      const secret = Keypair.random().secret();
      const resolver = new WalletResolver(
        buildConfigService({ walletEncryptionKey: ENCRYPTION_KEY }),
      );

      const account = buildAccount({
        encryptedSecretKey: encryptSecretKey(secret, ENCRYPTION_KEY),
      });
      const wallet = await resolver.walletForAccount(account);

      expect(wallet).toBeInstanceOf(KeypairWallet);
      expect(wallet.publicKey).toBe(Keypair.fromSecret(secret).publicKey());
    });

    it('creates a new account via a locally-generated encrypted keypair', async () => {
      const resolver = new WalletResolver(
        buildConfigService({ walletEncryptionKey: ENCRYPTION_KEY }),
      );

      const signer = await resolver.createAccountSigner();

      expect(signer).toHaveProperty('encryptedSecretKey');
      expect(createSigningKeyMock).not.toHaveBeenCalled();
    });

    it('vaultConfigured() and adminSigningConfigured() report false unless configured', () => {
      const resolver = new WalletResolver(buildConfigService({}));
      expect(resolver.vaultConfigured()).toBe(false);
      expect(resolver.adminSigningConfigured()).toBe(false);
    });

    it('adminWallet() falls back to the legacy admin secret', async () => {
      const adminSecret = Keypair.random().secret();
      const resolver = new WalletResolver(
        buildConfigService({
          adminSigningSecret: adminSecret,
          stellarNetwork: 'testnet',
        }),
      );

      const wallet = await resolver.adminWallet();

      expect(wallet).toBeInstanceOf(KeypairWallet);
      expect(wallet.publicKey).toBe(
        Keypair.fromSecret(adminSecret).publicKey(),
      );
    });
  });

  describe('with Vault configured', () => {
    function vaultConfigService(extra: Record<string, unknown> = {}) {
      return buildConfigService({
        vaultAddr: 'http://127.0.0.1:8200',
        vaultToken: 'test-token',
        stellarNetwork: 'testnet',
        ...extra,
      });
    }

    it('provisions a new account by creating a Vault transit key', async () => {
      const keypair = Keypair.random();
      createSigningKeyMock.mockResolvedValue(undefined);
      getPublicKeyMock.mockResolvedValue(keypair.rawPublicKey());

      const resolver = new WalletResolver(vaultConfigService());
      const signer = await resolver.createAccountSigner();

      expect(signer).toHaveProperty('signingKeyId');
      expect(signer.publicKey).toBe(keypair.publicKey());
      expect(createSigningKeyMock).toHaveBeenCalledTimes(1);
    });

    it('resolves an account with a signingKeyId via VaultWallet', async () => {
      const keypair = Keypair.random();
      getPublicKeyMock.mockResolvedValue(keypair.rawPublicKey());

      const resolver = new WalletResolver(vaultConfigService());
      const account = buildAccount({ signingKeyId: 'stellar-account-1' });
      const wallet = await resolver.walletForAccount(account);

      expect(wallet).toBeInstanceOf(VaultWallet);
      expect(wallet.publicKey).toBe(keypair.publicKey());
    });

    it('resolves the admin wallet from a Vault key name', async () => {
      const keypair = Keypair.random();
      getPublicKeyMock.mockResolvedValue(keypair.rawPublicKey());

      const resolver = new WalletResolver(
        vaultConfigService({ adminSigningKeyName: 'platform-admin' }),
      );
      const wallet = await resolver.adminWallet();

      expect(wallet).toBeInstanceOf(VaultWallet);
      expect(wallet.publicKey).toBe(keypair.publicKey());
      expect(getPublicKeyMock).toHaveBeenCalledWith('platform-admin');
    });

    it('adminSigningConfigured() requires adminSigningKeyName once Vault is on', () => {
      const resolver = new WalletResolver(vaultConfigService());
      expect(resolver.adminSigningConfigured()).toBe(false);

      const configured = new WalletResolver(
        vaultConfigService({ adminSigningKeyName: 'platform-admin' }),
      );
      expect(configured.adminSigningConfigured()).toBe(true);
    });

    it('never touches encryptedSecretKey/decryptSecretKey when the account uses a signingKeyId', async () => {
      const keypair = Keypair.random();
      getPublicKeyMock.mockResolvedValue(keypair.rawPublicKey());
      const resolver = new WalletResolver(vaultConfigService());
      const account = buildAccount({
        signingKeyId: 'stellar-account-1',
        encryptedSecretKey: 'not-real-ciphertext',
      });

      await expect(resolver.walletForAccount(account)).resolves.toBeInstanceOf(
        VaultWallet,
      );
    });
  });
});
