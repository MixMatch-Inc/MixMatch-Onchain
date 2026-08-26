import { randomUUID } from 'node:crypto';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  buildHighValuePaymentEnvelope,
  classifyStellarPaymentError,
  configureMultisig,
  coSignAndSubmitEnvelope,
  DefaultStellarClient,
  establishTrustline,
  findStrictReceivePath,
  findStrictSendPath,
  fundTestnetAccount,
  StellarPaymentError,
  StellarPaymentService as StellarPaymentEngine,
  streamAccountPayments,
  submitPathPayment,
  type PathQuote,
  type PaymentStreamEvent,
  type PaymentStreamHandle,
} from '@mixmatch/stellar';
import { Observable } from 'rxjs';
import type {
  EstablishTrustlineInput,
  EstablishTrustlineResponse,
  PathQuoteInput,
  PathQuoteResponse,
  SendPaymentInput,
} from '@mixmatch/shared';
import { PaymentFailedError } from './payment-errors';
import {
  StellarAccountRepository,
  type StellarAccountRecord,
} from './stellar-account.repository';
import {
  DuplicateIdempotencyKeyError,
  TransactionRepository,
  type TransactionRecord,
} from './transaction.repository';
import { WalletResolver } from './wallet-resolver';

function normalizeAmount(amount: string): string {
  return Number(amount).toFixed(7);
}

/** Horizon operation types whose `to`/`asset_*`/`amount` fields describe the destination side — matched by `findMatchingPayment`. */
const MATCHABLE_OPERATION_TYPES = new Set([
  'payment',
  'path_payment_strict_receive',
  'path_payment_strict_send',
]);

@Injectable()
export class PaymentsService {
  constructor(
    private readonly stellarAccountRepository: StellarAccountRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly stellarClient: DefaultStellarClient,
    private readonly paymentEngine: StellarPaymentEngine,
    private readonly configService: ConfigService,
    private readonly walletResolver: WalletResolver,
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
    const signer = await this.walletResolver.createAccountSigner();

    if (network === 'testnet') {
      await fundTestnetAccount(
        this.stellarClient.horizon,
        network,
        signer.publicKey,
      );
    }

    return this.stellarAccountRepository.create({
      userId,
      publicKey: signer.publicKey,
      network,
      ...('signingKeyId' in signer
        ? { signingKeyId: signer.signingKeyId }
        : { encryptedSecretKey: signer.encryptedSecretKey }),
    });
  }

  /**
   * Sends a payment on the caller's behalf — native XLM, or a custom asset
   * if `input.assetCode`/`input.assetIssuer` are set (the caller's account
   * must already hold a trustline to that asset; see `establishTrustline`).
   *
   * If `input.receiveAssetCode`/`input.receiveAssetIssuer` are set, this is
   * a *path payment*: the recipient receives a different asset than what
   * was sent, routed through Stellar's DEX. The path is resolved via
   * `findStrictSendPath`/`findStrictReceivePath` *before* the durable
   * idempotency row is created (a quote is a read — resolving it early just
   * means the persisted row always has both `amount` — what was sent — and
   * `destAmount` — what the recipient receives — filled in from the start).
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

    let quote: PathQuote | undefined;
    if (input.receiveAssetCode && input.receiveAssetIssuer) {
      quote = await this.resolvePathQuote(input);
    }

    if (this.isHighValuePayment(input, quote)) {
      return this.sendHighValuePayment(account, input, idempotencyKey);
    }

    let transaction: TransactionRecord;
    try {
      transaction = await this.transactionRepository.create({
        idempotencyKey,
        stellarAccountId: account.id,
        destinationPublicKey: input.destinationPublicKey,
        amount: quote ? quote.sourceAmount : input.amount,
        memo: input.memo,
        assetCode: input.assetCode,
        assetIssuer: input.assetIssuer,
        receiveAssetCode: input.receiveAssetCode,
        receiveAssetIssuer: input.receiveAssetIssuer,
        destAmount: quote?.destAmount,
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

    const wallet = await this.walletResolver.walletForAccount(account);

    try {
      const result = quote
        ? await submitPathPayment({
            client: this.stellarClient,
            sourceWallet: wallet,
            destinationPublicKey: input.destinationPublicKey,
            memo: input.memo,
            quote,
            slippageBps: input.slippageBps,
          })
        : await this.paymentEngine.submitPayment({
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
   * True if `input` needs an admin co-signature before it can be
   * submitted — see `sendHighValuePayment`. Scoped deliberately narrowly
   * for now: only plain native-XLM payments (no custom asset, no path
   * payment) are gated, and only when `ADMIN_SIGNING_SECRET` is
   * configured at all. Custom-asset and path-payment amounts aren't
   * gated yet — a known limitation, not a silent gap, since extending the
   * gate to those requires deciding what "value" means across assets
   * (a price oracle), which is out of scope here.
   */
  private isHighValuePayment(
    input: SendPaymentInput,
    quote: PathQuote | undefined,
  ): boolean {
    if (
      !this.walletResolver.adminSigningConfigured() ||
      quote ||
      input.assetCode
    ) {
      return false;
    }
    return Number(input.amount) > Number(this.highValueThresholdAmount());
  }

  /**
   * Handles a payment above the high-value threshold: lazily configures
   * the account for multisig on its first high-value payment (adds the
   * platform's admin key as a co-signer, sets thresholds — see
   * `@mixmatch/stellar`'s `configureMultisig`), builds a payment
   * transaction that requires both signatures to authorize, signs it with
   * only the account's own key, and persists it as `PENDING_SIGNATURE`
   * *without* submitting. An admin must explicitly approve (co-sign and
   * submit) or reject it — see `approvePendingSignature`/`rejectPendingSignature`.
   */
  private async sendHighValuePayment(
    account: StellarAccountRecord,
    input: SendPaymentInput,
    idempotencyKey: string,
  ): Promise<TransactionRecord> {
    const existing =
      await this.transactionRepository.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      return existing;
    }

    let currentAccount = account;
    if (!currentAccount.multisigConfigured) {
      const wallet = await this.walletResolver.walletForAccount(currentAccount);
      const admin = await this.walletResolver.adminWallet();
      await configureMultisig({
        client: this.stellarClient,
        wallet,
        adminPublicKey: admin.publicKey,
      });
      currentAccount =
        await this.stellarAccountRepository.markMultisigConfigured(
          currentAccount.id,
        );
    }

    const wallet = await this.walletResolver.walletForAccount(currentAccount);
    const { envelopeXdr } = await buildHighValuePaymentEnvelope({
      client: this.stellarClient,
      sourceWallet: wallet,
      destinationPublicKey: input.destinationPublicKey,
      amount: input.amount,
      memo: input.memo,
    });

    try {
      return await this.transactionRepository.create({
        idempotencyKey,
        stellarAccountId: currentAccount.id,
        destinationPublicKey: input.destinationPublicKey,
        amount: input.amount,
        memo: input.memo,
        pendingEnvelopeXdr: envelopeXdr,
      });
    } catch (error) {
      if (error instanceof DuplicateIdempotencyKeyError) {
        const raced =
          await this.transactionRepository.findByIdempotencyKey(idempotencyKey);
        if (raced) {
          return raced;
        }
      }
      throw error;
    }
  }

  /**
   * Approves a `PENDING_SIGNATURE` transaction: co-signs its stored
   * envelope with the admin key and submits it. Admin-only — see
   * `modules/payments/admin.controller.ts`.
   */
  async approvePendingSignature(
    transactionId: string,
  ): Promise<TransactionRecord> {
    const transaction =
      await this.getPendingSignatureTransaction(transactionId);

    try {
      const result = await coSignAndSubmitEnvelope({
        client: this.stellarClient,
        envelopeXdr: transaction.pendingEnvelopeXdr as string,
        adminWallet: await this.walletResolver.adminWallet(),
      });
      return await this.transactionRepository.updateStatus(transaction.id, {
        status: 'SUCCESS',
        stellarTxHash: result.hash,
        clearPendingEnvelope: true,
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
        clearPendingEnvelope: true,
      });
      throw new PaymentFailedError(classified.kind, classified.message);
    }
  }

  /**
   * Rejects a `PENDING_SIGNATURE` transaction: marks it `FAILED` without
   * ever attempting submission (the envelope, missing the admin's
   * signature, was never valid to submit anyway). Admin-only.
   */
  async rejectPendingSignature(
    transactionId: string,
  ): Promise<TransactionRecord> {
    const transaction =
      await this.getPendingSignatureTransaction(transactionId);
    return this.transactionRepository.updateStatus(transaction.id, {
      status: 'FAILED',
      failureCode: 'admin_rejected',
      failureReason: 'An administrator declined to co-sign this payment',
      clearPendingEnvelope: true,
    });
  }

  /** Admin-facing: every transaction currently awaiting a co-signature, across all users. */
  async listPendingSignatures(): Promise<TransactionRecord[]> {
    return this.transactionRepository.findPendingSignature();
  }

  private async getPendingSignatureTransaction(
    transactionId: string,
  ): Promise<TransactionRecord> {
    const transaction =
      await this.transactionRepository.findById(transactionId);
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    if (
      transaction.status !== 'PENDING_SIGNATURE' ||
      !transaction.pendingEnvelopeXdr
    ) {
      throw new PaymentFailedError(
        'malformed_transaction',
        `Transaction ${transactionId} is not awaiting a signature`,
      );
    }
    return transaction;
  }

  private highValueThresholdAmount(): string {
    return this.configService.getOrThrow<string>('highValueThresholdAmount');
  }

  /**
   * Resolves a path payment's quote up front, so `sendPayment` throws
   * before creating a DB row if no path exists at all.
   */
  private async resolvePathQuote(input: SendPaymentInput): Promise<PathQuote> {
    const sourceAsset =
      input.assetCode && input.assetIssuer
        ? { code: input.assetCode, issuer: input.assetIssuer }
        : undefined;
    const destAsset =
      input.receiveAssetCode && input.receiveAssetIssuer
        ? { code: input.receiveAssetCode, issuer: input.receiveAssetIssuer }
        : undefined;
    const mode = input.pathMode ?? 'strictSend';

    const quote =
      mode === 'strictSend'
        ? await findStrictSendPath({
            client: this.stellarClient,
            sourceAsset,
            destAsset,
            amount: input.amount,
          })
        : await findStrictReceivePath({
            client: this.stellarClient,
            sourceAsset,
            destAsset,
            amount: input.amount,
          });

    if (!quote) {
      throw new PaymentFailedError(
        'no_payment_path',
        'No payment path exists between the two assets for the requested amount',
      );
    }
    return quote;
  }

  /**
   * Previews a path payment without submitting anything — resolves the
   * best available path and returns the resulting quote (source amount,
   * destination amount, and the intermediate assets it routes through),
   * so a client can show "you send X, recipient gets approximately Y"
   * before the caller confirms.
   */
  async previewPath(input: PathQuoteInput): Promise<PathQuoteResponse> {
    const sourceAsset =
      input.source.assetCode && input.source.assetIssuer
        ? { code: input.source.assetCode, issuer: input.source.assetIssuer }
        : undefined;
    const destAsset =
      input.dest.assetCode && input.dest.assetIssuer
        ? { code: input.dest.assetCode, issuer: input.dest.assetIssuer }
        : undefined;

    const quote =
      input.mode === 'strictSend'
        ? await findStrictSendPath({
            client: this.stellarClient,
            sourceAsset,
            destAsset,
            amount: input.amount,
          })
        : await findStrictReceivePath({
            client: this.stellarClient,
            sourceAsset,
            destAsset,
            amount: input.amount,
          });

    if (!quote) {
      throw new PaymentFailedError(
        'no_payment_path',
        'No payment path exists between the two assets for the requested amount',
      );
    }

    return {
      mode: quote.mode,
      sourceAmount: quote.sourceAmount,
      destAmount: quote.destAmount,
      path: quote.path.map((hop) =>
        hop ? { assetCode: hop.code, assetIssuer: hop.issuer } : null,
      ),
    };
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
    const wallet = await this.walletResolver.walletForAccount(account);

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

      // For a path payment, the recipient receives destAmount of the
      // receive asset — that's what shows up as `amount`/`asset_*` on the
      // Horizon operation record, not the amount/asset that was sent.
      const expectedAmount = normalizeAmount(
        transaction.destAmount ?? transaction.amount,
      );

      for (const operation of page.records) {
        if (
          MATCHABLE_OPERATION_TYPES.has(String(operation.type)) &&
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
   * True if a Horizon payment-operation record is for the same asset the
   * *recipient* should end up holding — the receive asset for a path
   * payment, or otherwise the same asset that was sent (native XLM, or the
   * matching custom asset code + issuer). Horizon reports non-native
   * assets as `asset_type: 'credit_alphanum4' | 'credit_alphanum12'` with
   * separate `asset_code`/`asset_issuer` fields; for `payment` and both
   * path-payment operation types, these describe the *destination* asset.
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
    const expectedCode = transaction.receiveAssetCode ?? transaction.assetCode;
    const expectedIssuer =
      transaction.receiveAssetIssuer ?? transaction.assetIssuer;
    if (!expectedCode) {
      return operation.asset_type === 'native';
    }
    return (
      operation.asset_type !== 'native' &&
      'asset_code' in operation &&
      operation.asset_code === expectedCode &&
      'asset_issuer' in operation &&
      operation.asset_issuer === expectedIssuer
    );
  }

  /**
   * Pushes a transaction's status the moment Horizon's payment stream for
   * the caller's account reports it — an alternative to `getTransactionStatus`
   * polling. Bridged to clients over SSE, see `PaymentsController`'s
   * `stream` route. Completes if the caller has no Stellar account yet;
   * otherwise stays open until the subscriber unsubscribes (client
   * disconnects), at which point the underlying Horizon stream — which
   * reconnects on its own using the last-seen event's cursor, see
   * `@mixmatch/stellar`'s `streamAccountPayments` — is torn down too.
   */
  streamTransactionUpdates(userId: string): Observable<TransactionRecord> {
    return new Observable<TransactionRecord>((subscriber) => {
      let unsubscribed = false;
      let handle: PaymentStreamHandle | undefined;

      void this.stellarAccountRepository.findByUserId(userId).then(
        (account) => {
          if (unsubscribed) {
            return;
          }
          if (!account) {
            subscriber.complete();
            return;
          }

          handle = streamAccountPayments({
            client: this.stellarClient,
            accountPublicKey: account.publicKey,
            onEvent: (event) => {
              void this.resolveStreamEvent(account.id, event)
                .then((updated) => {
                  if (updated && !unsubscribed) {
                    subscriber.next(updated);
                  }
                })
                .catch((error: unknown) => subscriber.error(error));
            },
          });
        },
        (error: unknown) => subscriber.error(error),
      );

      return () => {
        unsubscribed = true;
        handle?.close();
      };
    });
  }

  /** Checks a single streamed Horizon event against the account's still-PENDING transactions, updating and returning the one it matches, if any. */
  private async resolveStreamEvent(
    stellarAccountId: string,
    event: PaymentStreamEvent,
  ): Promise<TransactionRecord | null> {
    if (!MATCHABLE_OPERATION_TYPES.has(event.type)) {
      return null;
    }

    const pending =
      await this.transactionRepository.findPendingByStellarAccountId(
        stellarAccountId,
      );
    const expectedAmount = event.amount
      ? Number(event.amount).toFixed(7)
      : undefined;

    const match = pending.find((transaction) => {
      const pseudoOperation = {
        asset_type: event.assetType,
        asset_code: event.assetCode,
        asset_issuer: event.assetIssuer,
      };
      return (
        this.matchesTransactionAsset(pseudoOperation, transaction) &&
        event.to === transaction.destinationPublicKey &&
        expectedAmount ===
          normalizeAmount(transaction.destAmount ?? transaction.amount) &&
        new Date(event.createdAt) >= transaction.createdAt
      );
    });

    if (!match) {
      return null;
    }

    return this.transactionRepository.updateStatus(match.id, {
      status: 'SUCCESS',
      stellarTxHash: event.transactionHash,
    });
  }

  private reconciliationStaleMs(): number {
    return this.configService.getOrThrow<number>('reconciliationStaleMs');
  }

  private reconciliationEscalationMs(): number {
    return this.configService.getOrThrow<number>('reconciliationEscalationMs');
  }
}
