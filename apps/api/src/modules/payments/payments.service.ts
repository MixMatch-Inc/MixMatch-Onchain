import { randomUUID } from 'node:crypto';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  classifyStellarPaymentError,
  DefaultStellarClient,
  establishTrustline,
  fundTestnetAccount,
  generateStellarAccount,
  KeypairWallet,
  StellarPaymentError,
  StellarPaymentService as StellarPaymentEngine,
} from '@mixmatch/stellar';
import type {
  EstablishTrustlineInput,
  EstablishTrustlineResponse,
  SendPaymentInput,
} from '@mixmatch/shared';
import { PaymentFailedError } from './payment-errors';
import { decryptSecretKey, encryptSecretKey } from './wallet-encryption';
import {
  StellarAccountRepository,
  type StellarAccountRecord,
} from './stellar-account.repository';
import {
  DuplicateIdempotencyKeyError,
  TransactionRepository,
  type TransactionRecord,
} from './transaction.repository';

function normalizeAmount(amount: string): string {
  return Number(amount).toFixed(7);
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly stellarAccountRepository: StellarAccountRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly stellarClient: DefaultStellarClient,
    private readonly paymentEngine: StellarPaymentEngine,
    private readonly configService: ConfigService,
  ) {}

  /** Returns the caller's Stellar account, provisioning (and, on testnet, funding) one on first use. */
  async getOrCreateStellarAccount(
    userId: string,
  ): Promise<StellarAccountRecord> {
    const existing = await this.stellarAccountRepository.findByUserId(userId);
    if (existing) {
      return existing;
    }

    const network = this.stellarClient.getNetwork();
    const generated = generateStellarAccount();

    if (network === 'testnet') {
      await fundTestnetAccount(
        this.stellarClient.horizon,
        network,
        generated.publicKey,
      );
    }

    return this.stellarAccountRepository.create({
      userId,
      publicKey: generated.publicKey,
      encryptedSecretKey: encryptSecretKey(
        generated.wallet.secretKey,
        this.walletEncryptionKey(),
      ),
      network,
    });
  }

  /**
   * Sends a payment on the caller's behalf — native XLM, or a custom asset
   * if `input.assetCode`/`input.assetIssuer` are set (the caller's account
   * must already hold a trustline to that asset; see `establishTrustline`).
   *
   * Durable idempotency: a `Transaction` row is created (with a unique
   * constraint on `idempotencyKey`) *before* submitting to Stellar. If a row
   * for this key already exists — including across process restarts — that
   * row's current state is returned instead of submitting a second payment.
   */
  async sendPayment(
    userId: string,
    input: SendPaymentInput,
  ): Promise<TransactionRecord> {
    const account = await this.getOrCreateStellarAccount(userId);
    const idempotencyKey = input.idempotencyKey ?? randomUUID();

    let transaction: TransactionRecord;
    try {
      transaction = await this.transactionRepository.create({
        idempotencyKey,
        stellarAccountId: account.id,
        destinationPublicKey: input.destinationPublicKey,
        amount: input.amount,
        memo: input.memo,
        assetCode: input.assetCode,
        assetIssuer: input.assetIssuer,
      });
    } catch (error) {
      if (error instanceof DuplicateIdempotencyKeyError) {
        const existing =
          await this.transactionRepository.findByIdempotencyKey(idempotencyKey);
        if (existing) {
          return existing;
        }
      }
      throw error;
    }

    const wallet = KeypairWallet.fromSecret(
      account.network,
      decryptSecretKey(account.encryptedSecretKey, this.walletEncryptionKey()),
    );

    try {
      const result = await this.paymentEngine.submitPayment({
        sourceWallet: wallet,
        destinationPublicKey: input.destinationPublicKey,
        amount: input.amount,
        memo: input.memo,
        asset:
          input.assetCode && input.assetIssuer
            ? { code: input.assetCode, issuer: input.assetIssuer }
            : undefined,
      });

      return await this.transactionRepository.updateStatus(transaction.id, {
        status: 'SUCCESS',
        stellarTxHash: result.hash,
      });
    } catch (error) {
      const classified =
        error instanceof StellarPaymentError
          ? error
          : classifyStellarPaymentError(error);
      await this.transactionRepository.updateStatus(transaction.id, {
        status: 'FAILED',
        failureCode: classified.kind,
        failureReason: classified.message,
      });
      throw new PaymentFailedError(classified.kind, classified.message);
    }
  }

  /**
   * Establishes a trustline from the caller's custodial account to a custom
   * asset, so it can subsequently hold/receive/send that asset via
   * `sendPayment`. This is a live Stellar operation (not durably persisted
   * via our own idempotency mechanism the way payments are) — a `changeTrust`
   * call is itself idempotent on Stellar's side (calling it again with the
   * same limit is a no-op), so a client-side retry is safe without our own
   * dedup layer.
   */
  async establishTrustlineForUser(
    userId: string,
    input: EstablishTrustlineInput,
  ): Promise<EstablishTrustlineResponse> {
    const account = await this.getOrCreateStellarAccount(userId);
    const wallet = KeypairWallet.fromSecret(
      account.network,
      decryptSecretKey(account.encryptedSecretKey, this.walletEncryptionKey()),
    );

    try {
      const result = await establishTrustline({
        client: this.stellarClient,
        wallet,
        asset: { code: input.assetCode, issuer: input.assetIssuer },
        limit: input.limit,
      });

      return {
        stellarTxHash: result.hash,
        assetCode: input.assetCode,
        assetIssuer: input.assetIssuer,
      };
    } catch (error) {
      const classified =
        error instanceof StellarPaymentError
          ? error
          : classifyStellarPaymentError(error);
      throw new PaymentFailedError(classified.kind, classified.message);
    }
  }

  /** Returns a transaction's current status, transparently reconciling it first if it's stuck PENDING. */
  async getTransactionStatus(
    userId: string,
    transactionId: string,
  ): Promise<TransactionRecord> {
    const transaction = await this.getOwnedTransaction(userId, transactionId);
    if (transaction.status === 'PENDING' && this.isStale(transaction)) {
      return this.reconcileTransaction(transaction);
    }
    return transaction;
  }

  async listTransactionHistory(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ transactions: TransactionRecord[]; total: number }> {
    const account = await this.stellarAccountRepository.findByUserId(userId);
    if (!account) {
      return { transactions: [], total: 0 };
    }
    return this.transactionRepository.listByStellarAccountId(
      account.id,
      page,
      limit,
    );
  }

  /** Manually triggers reconciliation for one transaction the caller owns. */
  async reconcileTransactionById(
    userId: string,
    transactionId: string,
  ): Promise<TransactionRecord> {
    const transaction = await this.getOwnedTransaction(userId, transactionId);
    return this.reconcileTransaction(transaction);
  }

  /**
   * Batch reconciliation entry point for stuck PENDING transactions.
   * Invoked on a schedule by `ReconciliationJob` — see
   * `apps/api/src/modules/payments/reconciliation.job.ts`.
   */
  async reconcilePendingTransactions(): Promise<TransactionRecord[]> {
    const stale = await this.transactionRepository.findStalePending(
      new Date(Date.now() - this.reconciliationStaleMs()),
    );
    const reconciled: TransactionRecord[] = [];
    for (const transaction of stale) {
      reconciled.push(await this.reconcileTransaction(transaction));
    }
    return reconciled;
  }

  private isStale(transaction: TransactionRecord): boolean {
    return (
      Date.now() - transaction.createdAt.getTime() >
      this.reconciliationStaleMs()
    );
  }

  /** True once a transaction has been stuck PENDING long enough that automatic retries should give up. */
  private isPastEscalationWindow(transaction: TransactionRecord): boolean {
    return (
      Date.now() - transaction.createdAt.getTime() >
      this.reconciliationEscalationMs()
    );
  }

  private async getOwnedTransaction(
    userId: string,
    transactionId: string,
  ): Promise<TransactionRecord> {
    const transaction =
      await this.transactionRepository.findById(transactionId);
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    const account = await this.stellarAccountRepository.findById(
      transaction.stellarAccountId,
    );
    if (!account || account.userId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this transaction',
      );
    }
    return transaction;
  }

  private async reconcileTransaction(
    transaction: TransactionRecord,
  ): Promise<TransactionRecord> {
    if (transaction.status !== 'PENDING') {
      return transaction;
    }

    const account = await this.stellarAccountRepository.findById(
      transaction.stellarAccountId,
    );
    if (!account) {
      return this.transactionRepository.updateStatus(transaction.id, {
        status: 'FAILED',
        failureCode: 'reconciliation_account_missing',
        failureReason: 'Source Stellar account no longer exists',
      });
    }

    const matchedTxHash = await this.findMatchingPayment(
      account.publicKey,
      transaction,
    );
    if (matchedTxHash) {
      return this.transactionRepository.updateStatus(transaction.id, {
        status: 'SUCCESS',
        stellarTxHash: matchedTxHash,
      });
    }

    // No match yet — this is inherently a "not found so far" result, not
    // proof the payment failed (Horizon may be lagging, or briefly
    // unreachable). Only give up and flag it for manual review once we've
    // been retrying across the full escalation window; before that, leave
    // it PENDING so the next scheduled pass tries again.
    if (this.isPastEscalationWindow(transaction)) {
      return this.transactionRepository.updateStatus(transaction.id, {
        status: 'NEEDS_REVIEW',
        failureCode: 'reconciliation_escalated',
        failureReason:
          'No matching payment found on-chain after repeated reconciliation attempts — needs manual verification against the ledger',
      });
    }

    return transaction;
  }

  private async findMatchingPayment(
    sourcePublicKey: string,
    transaction: TransactionRecord,
  ): Promise<string | null> {
    try {
      const page = await this.stellarClient.horizon
        .payments()
        .forAccount(sourcePublicKey)
        .order('desc')
        .limit(50)
        .call();

      const expectedAmount = normalizeAmount(transaction.amount);

      for (const operation of page.records) {
        if (
          String(operation.type) === 'payment' &&
          'asset_type' in operation &&
          this.matchesTransactionAsset(operation, transaction) &&
          'to' in operation &&
          operation.to === transaction.destinationPublicKey &&
          'amount' in operation &&
          operation.amount === expectedAmount &&
          new Date(operation.created_at) >= transaction.createdAt
        ) {
          return operation.transaction_hash;
        }
      }
    } catch {
      // Horizon unreachable or query failed — leave PENDING, retry on the next pass.
    }
    return null;
  }

  /**
   * True if a Horizon payment-operation record is for the same asset as
   * `transaction` — native XLM, or the matching custom asset code + issuer.
   * Horizon reports non-native assets as `asset_type: 'credit_alphanum4' |
   * 'credit_alphanum12'` with separate `asset_code`/`asset_issuer` fields.
   */
  private matchesTransactionAsset(
    operation: unknown,
    transaction: TransactionRecord,
  ): boolean {
    if (
      typeof operation !== 'object' ||
      operation === null ||
      !('asset_type' in operation)
    ) {
      return false;
    }
    if (!transaction.assetCode) {
      return operation.asset_type === 'native';
    }
    return (
      operation.asset_type !== 'native' &&
      'asset_code' in operation &&
      operation.asset_code === transaction.assetCode &&
      'asset_issuer' in operation &&
      operation.asset_issuer === transaction.assetIssuer
    );
  }

  private reconciliationStaleMs(): number {
    return this.configService.getOrThrow<number>('reconciliationStaleMs');
  }

  private reconciliationEscalationMs(): number {
    return this.configService.getOrThrow<number>('reconciliationEscalationMs');
  }

  private walletEncryptionKey(): string {
    return this.configService.getOrThrow<string>('walletEncryptionKey');
  }
}
