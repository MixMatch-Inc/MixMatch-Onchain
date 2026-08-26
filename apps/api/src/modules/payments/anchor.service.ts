import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  authenticateSep10,
  DefaultStellarClient,
  fetchStellarToml,
  getSep24Transaction,
  initiateSep24Deposit,
  initiateSep24Withdraw,
  SEP24_IN_PROGRESS_STATUSES,
  type Sep24Transaction,
} from '@mixmatch/stellar';
import type {
  AnchorTransactionKind,
  AnchorTransactionStatus,
  DepositAnchorInput,
  WithdrawAnchorInput,
} from '@mixmatch/shared';
import { PaymentsService } from './payments.service';
import {
  AnchorTransactionRepository,
  type AnchorTransactionRecord,
} from './anchor-transaction.repository';
import { StellarAccountRepository } from './stellar-account.repository';
import { WalletResolver } from './wallet-resolver';

/** Anchor unreachable, misconfigured (missing required SEP-1 fields), or rejected a SEP-10/SEP-24 call. */
export class AnchorError extends HttpException {
  constructor(message: string) {
    super({ code: 'ANCHOR_ERROR', message }, HttpStatus.BAD_GATEWAY);
  }
}

const IN_PROGRESS_STATUSES = [
  ...SEP24_IN_PROGRESS_STATUSES,
] as AnchorTransactionStatus[];

@Injectable()
export class AnchorService {
  constructor(
    private readonly anchorTransactionRepository: AnchorTransactionRepository,
    private readonly stellarAccountRepository: StellarAccountRepository,
    private readonly paymentsService: PaymentsService,
    private readonly stellarClient: DefaultStellarClient,
    private readonly configService: ConfigService,
    private readonly walletResolver: WalletResolver,
  ) {}

  /** Starts a SEP-24 interactive deposit — returns the anchor's interactive URL for the user to open and complete KYC/payment details. */
  async depositForUser(
    userId: string,
    input: DepositAnchorInput,
  ): Promise<{ transaction: AnchorTransactionRecord; interactiveUrl: string }> {
    return this.initiate(userId, 'deposit', input);
  }

  /** Starts a SEP-24 interactive withdrawal — returns the anchor's interactive URL for the user to open and complete payout details. */
  async withdrawForUser(
    userId: string,
    input: WithdrawAnchorInput,
  ): Promise<{ transaction: AnchorTransactionRecord; interactiveUrl: string }> {
    return this.initiate(userId, 'withdrawal', input);
  }

  /** Returns an anchor transaction's current status, re-polling the anchor first if it's still in progress. */
  async getStatusForUser(
    userId: string,
    id: string,
  ): Promise<AnchorTransactionRecord> {
    const transaction = await this.getOwnedAnchorTransaction(userId, id);
    if (!SEP24_IN_PROGRESS_STATUSES.has(transaction.status)) {
      return transaction;
    }
    return this.refreshFromAnchor(transaction);
  }

  async listHistoryForUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ transactions: AnchorTransactionRecord[]; total: number }> {
    const account = await this.stellarAccountRepository.findByUserId(userId);
    if (!account) {
      return { transactions: [], total: 0 };
    }

    const inProgress =
      await this.anchorTransactionRepository.findInProgressByStellarAccountId(
        account.id,
        IN_PROGRESS_STATUSES,
      );
    await Promise.all(
      inProgress.map((transaction) =>
        this.refreshFromAnchor(transaction).catch(() => undefined),
      ),
    );

    return this.anchorTransactionRepository.listByStellarAccountId(
      account.id,
      page,
      limit,
    );
  }

  private async initiate(
    userId: string,
    kind: AnchorTransactionKind,
    input: DepositAnchorInput | WithdrawAnchorInput,
  ): Promise<{ transaction: AnchorTransactionRecord; interactiveUrl: string }> {
    const account =
      await this.paymentsService.getOrCreateStellarAccount(userId);
    const homeDomain = this.anchorHomeDomain();
    const toml = await fetchStellarToml(homeDomain);
    if (
      !toml.webAuthEndpoint ||
      !toml.signingKey ||
      !toml.transferServerSep24
    ) {
      throw new AnchorError(
        `Anchor at ${homeDomain} is missing required SEP-1 metadata`,
      );
    }

    const wallet = await this.walletResolver.walletForAccount(account);

    try {
      const jwt = await authenticateSep10({
        webAuthEndpoint: toml.webAuthEndpoint,
        serverSigningKey: toml.signingKey,
        homeDomain,
        wallet,
        networkPassphrase: this.stellarClient.networkPassphrase,
      });

      const initiateFn =
        kind === 'deposit' ? initiateSep24Deposit : initiateSep24Withdraw;
      const interactive = await initiateFn({
        transferServerSep24: toml.transferServerSep24,
        jwt,
        assetCode: input.assetCode,
        account: wallet.publicKey,
        amount: input.amount,
      });

      const initialStatus = await getSep24Transaction({
        transferServerSep24: toml.transferServerSep24,
        jwt,
        id: interactive.id,
      });

      const transaction = await this.anchorTransactionRepository.create({
        stellarAccountId: account.id,
        kind,
        assetCode: input.assetCode,
        homeDomain,
        sep24TransactionId: interactive.id,
        interactiveUrl: interactive.url,
        ...sep24TransactionFields(initialStatus),
      });

      return { transaction, interactiveUrl: interactive.url };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new AnchorError(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private async refreshFromAnchor(
    transaction: AnchorTransactionRecord,
  ): Promise<AnchorTransactionRecord> {
    const account = await this.stellarAccountRepository.findById(
      transaction.stellarAccountId,
    );
    if (!account) {
      return transaction;
    }

    const toml = await fetchStellarToml(transaction.homeDomain);
    if (
      !toml.webAuthEndpoint ||
      !toml.signingKey ||
      !toml.transferServerSep24
    ) {
      return transaction;
    }

    const wallet = await this.walletResolver.walletForAccount(account);

    const jwt = await authenticateSep10({
      webAuthEndpoint: toml.webAuthEndpoint,
      serverSigningKey: toml.signingKey,
      homeDomain: transaction.homeDomain,
      wallet,
      networkPassphrase: this.stellarClient.networkPassphrase,
    });

    const latest = await getSep24Transaction({
      transferServerSep24: toml.transferServerSep24,
      jwt,
      id: transaction.sep24TransactionId,
    });

    return this.anchorTransactionRepository.updateFromAnchor(transaction.id, {
      status: latest.status,
      amountIn: latest.amountIn ?? undefined,
      amountOut: latest.amountOut ?? undefined,
      stellarTransactionId: latest.stellarTransactionId ?? undefined,
      externalTransactionId: latest.externalTransactionId ?? undefined,
      message: latest.message ?? undefined,
      completedAt: latest.completedAt
        ? new Date(latest.completedAt)
        : undefined,
    });
  }

  private async getOwnedAnchorTransaction(
    userId: string,
    id: string,
  ): Promise<AnchorTransactionRecord> {
    const transaction = await this.anchorTransactionRepository.findById(id);
    if (!transaction) {
      throw new NotFoundException('Anchor transaction not found');
    }
    const account = await this.stellarAccountRepository.findById(
      transaction.stellarAccountId,
    );
    if (!account || account.userId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this anchor transaction',
      );
    }
    return transaction;
  }

  private anchorHomeDomain(): string {
    return this.configService.getOrThrow<string>('anchorHomeDomain');
  }
}

function sep24TransactionFields(transaction: Sep24Transaction) {
  return {
    status: transaction.status,
    moreInfoUrl: transaction.moreInfoUrl ?? undefined,
    amountIn: transaction.amountIn ?? undefined,
    amountOut: transaction.amountOut ?? undefined,
    stellarTransactionId: transaction.stellarTransactionId ?? undefined,
    externalTransactionId: transaction.externalTransactionId ?? undefined,
    message: transaction.message ?? undefined,
    startedAt: new Date(transaction.startedAt),
    completedAt: transaction.completedAt
      ? new Date(transaction.completedAt)
      : undefined,
  };
}
