import { randomUUID } from 'node:crypto';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VaultTransitClient } from '@mixmatch/kms';
import {
  generateStellarAccount,
  KeypairWallet,
  VaultWallet,
  type StellarNetwork,
  type Wallet,
} from '@mixmatch/stellar';
import { StrKey } from '@stellar/stellar-sdk';
import { decryptSecretKey, encryptSecretKey } from './wallet-encryption';
import type { StellarAccountRecord } from './stellar-account.repository';

/**
 * Resolves signing capability for a Stellar account, dispatching on which
 * key-custody model that account uses: `signingKeyId` → Vault-backed
 * `VaultWallet` (every account created after the KMS migration; see
 * `apps/api/src/modules/payments/README.md`'s "Wallet custody" section),
 * or `encryptedSecretKey` → legacy `KeypairWallet` (accounts created
 * before it, kept working indefinitely but never used for new accounts).
 *
 * Also owns admin-co-signer resolution (`adminWallet`) and provisioning a
 * brand-new account's signing key (`createAccountSigner`), so every path
 * that used to reach directly into `WALLET_ENCRYPTION_KEY`/`Keypair`
 * material now goes through one chokepoint instead of duplicating the
 * branch in four services.
 */
@Injectable()
export class WalletResolver {
  private readonly logger = new Logger(WalletResolver.name);
  private vaultClient: VaultTransitClient | undefined;

  constructor(private readonly configService: ConfigService) {}

  /** True once VAULT_ADDR/VAULT_TOKEN are configured — the gate for using Vault at all. */
  vaultConfigured(): boolean {
    return Boolean(this.configService.get<string>('vaultAddr'));
  }

  /** True once an admin co-signer is configured (Vault-backed or legacy secret) — the gate for the high-value-payment flow. */
  adminSigningConfigured(): boolean {
    return this.vaultConfigured()
      ? Boolean(this.configService.get<string>('adminSigningKeyName'))
      : Boolean(this.configService.get<string>('adminSigningSecret'));
  }

  async walletForAccount(account: StellarAccountRecord): Promise<Wallet> {
    if (account.signingKeyId) {
      const publicKeyBytes = await this.client().getPublicKey(
        account.signingKeyId,
      );
      return new VaultWallet(
        account.network,
        StrKey.encodeEd25519PublicKey(publicKeyBytes),
        account.signingKeyId,
        this.client(),
      );
    }
    if (!account.encryptedSecretKey) {
      throw new Error(
        `Stellar account ${account.id} has neither signingKeyId nor encryptedSecretKey`,
      );
    }

    // #891: a corrupted/tampered DB value (or a rotated WALLET_ENCRYPTION_KEY)
    // makes `decryptSecretKey` throw a generic `Error` that would otherwise
    // bubble up as an unhandled 500 with a stack trace. Catch it here and
    // convert it to a controlled InternalServerErrorException with a clear
    // log entry pointing at the offending account row.
    try {
      return KeypairWallet.fromSecret(
        account.network,
        decryptSecretKey(
          account.encryptedSecretKey,
          this.walletEncryptionKey(),
        ),
      );
    } catch (error) {
      this.logger.error(
        `Failed to decrypt the stored secret key for Stellar account ${account.id} — the encrypted value may be corrupted or WALLET_ENCRYPTION_KEY may have changed`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        'Stored signing key could not be decrypted',
      );
    }
  }

  /**
   * Provisions signing capability for a brand-new account: a Vault
   * transit key if Vault is configured, otherwise a locally-generated
   * (and immediately AES-256-GCM-encrypted) keypair — the same legacy
   * behavior as before this migration, kept as the no-Vault fallback for
   * local development.
   */
  async createAccountSigner(): Promise<
    | { publicKey: string; signingKeyId: string }
    | { publicKey: string; encryptedSecretKey: string }
  > {
    if (this.vaultConfigured()) {
      const keyName = `stellar-account-${randomUUID()}`;
      await this.client().createSigningKey(keyName);
      const publicKeyBytes = await this.client().getPublicKey(keyName);
      return {
        publicKey: StrKey.encodeEd25519PublicKey(publicKeyBytes),
        signingKeyId: keyName,
      };
    }

    const generated = generateStellarAccount();
    return {
      publicKey: generated.publicKey,
      encryptedSecretKey: encryptSecretKey(
        generated.wallet.secretKey,
        this.walletEncryptionKey(),
      ),
    };
  }

  /** The platform's admin co-signing wallet, used to approve high-value payments. */
  async adminWallet(): Promise<Wallet> {
    if (this.vaultConfigured()) {
      const keyName = this.configService.getOrThrow<string>(
        'adminSigningKeyName',
      );
      const publicKeyBytes = await this.client().getPublicKey(keyName);
      return new VaultWallet(
        this.stellarNetwork(),
        StrKey.encodeEd25519PublicKey(publicKeyBytes),
        keyName,
        this.client(),
      );
    }
    return KeypairWallet.fromSecret(
      this.stellarNetwork(),
      this.configService.getOrThrow<string>('adminSigningSecret'),
    );
  }

  private client(): VaultTransitClient {
    this.vaultClient ??= new VaultTransitClient({
      address: this.configService.getOrThrow<string>('vaultAddr'),
      token: this.configService.getOrThrow<string>('vaultToken'),
      mountPath: this.configService.get<string>('vaultTransitMountPath'),
    });
    return this.vaultClient;
  }

  private stellarNetwork(): StellarNetwork {
    return this.configService.getOrThrow<StellarNetwork>('stellarNetwork');
  }

  private walletEncryptionKey(): string {
    return this.configService.getOrThrow<string>('walletEncryptionKey');
  }
}
