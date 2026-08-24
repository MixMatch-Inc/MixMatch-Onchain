import { randomUUID } from 'node:crypto';
import { ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  depositToEscrow,
  DefaultStellarClient,
  getEscrow,
  KeypairWallet,
  refundEscrow,
  releaseEscrow,
  SorobanInvocationError,
} from '@mixmatch/stellar';
import type { DepositEscrowInput } from '@mixmatch/shared';
import { decryptSecretKey } from './wallet-encryption';
import { PaymentsService } from './payments.service';
import {
  DuplicateEscrowIdempotencyKeyError,
  EscrowRepository,
  type EscrowRecord,
} from './escrow.repository';
import { StellarAccountRepository } from './stellar-account.repository';

/** Mirrors `PaymentFailedError`'s HTTP-facing shape for Soroban escrow invocation failures. */
export class EscrowFailedError extends HttpException {
  constructor(message: string) {
    super({ code: 'ESCROW_FAILED', message }, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

@Injectable()
export class EscrowService {
  constructor(
    private readonly escrowRepository: EscrowRepository,
    private readonly stellarAccountRepository: StellarAccountRepository,
    private readonly paymentsService: PaymentsService,
    private readonly stellarClient: DefaultStellarClient,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Locks `input.amount` of `input.tokenContractId` into the escrow
   * contract on the caller's behalf. Durably idempotent the same way
   * `PaymentsService.sendPayment` is: the DB row is created *before* the
   * deposit is submitted, so a retry with the same `idempotencyKey`
   * returns the existing row instead of depositing twice.
   */
  async depositForUser(userId: string, input: DepositEscrowInput): Promise<EscrowRecord> {
    const account = await this.paymentsService.getOrCreateStellarAccount(userId);
    const idempotencyKey = input.idempotencyKey ?? randomUUID();

    let escrow: EscrowRecord;
    try {
      escrow = await this.escrowRepository.create({
        idempotencyKey,
        payerStellarAccountId: account.id,
        payeePublicKey: input.payeePublicKey,
        tokenContractId: input.tokenContractId,
        amount: input.amount,
      });
    } catch (error) {
      if (error instanceof DuplicateEscrowIdempotencyKeyError) {
        const existing = await this.escrowRepository.findByIdempotencyKey(idempotencyKey);
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
      const result = await depositToEscrow({
        client: this.stellarClient,
        contractId: this.escrowContractId(),
        payerWallet: wallet,
        payeePublicKey: input.payeePublicKey,
        tokenContractId: input.tokenContractId,
        amount: input.amount,
        timeoutLedgers: input.timeoutLedgers,
      });

      const onChain = await getEscrow({
        client: this.stellarClient,
        contractId: this.escrowContractId(),
        escrowId: result.escrowId,
      });

      return await this.escrowRepository.updateStatus(escrow.id, {
        status: 'LOCKED',
        onChainEscrowId: result.escrowId.toString(),
        timeoutLedger: onChain.timeoutLedger,
        depositTxHash: result.hash,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.escrowRepository.updateStatus(escrow.id, {
        status: 'FAILED',
        failureCode: error instanceof SorobanInvocationError ? 'soroban_invocation_failed' : 'unknown',
        failureReason: message,
      });
      throw new EscrowFailedError(message);
    }
  }

  /** Releases the caller's locked escrow to its payee. Only the escrow's payer may do this. */
  async releaseForUser(userId: string, escrowId: string): Promise<EscrowRecord> {
    const escrow = await this.getOwnedEscrow(userId, escrowId);
    if (escrow.status !== 'LOCKED' || !escrow.onChainEscrowId) {
      throw new EscrowFailedError(`Escrow ${escrowId} is not in a releasable state`);
    }

    const account = await this.stellarAccountRepository.findById(escrow.payerStellarAccountId);
    if (!account) {
      throw new NotFoundException('Stellar account not found');
    }
    const wallet = KeypairWallet.fromSecret(
      account.network,
      decryptSecretKey(account.encryptedSecretKey, this.walletEncryptionKey()),
    );

    try {
      const result = await releaseEscrow({
        client: this.stellarClient,
        contractId: this.escrowContractId(),
        escrowId: BigInt(escrow.onChainEscrowId),
        payerWallet: wallet,
      });
      return await this.escrowRepository.updateStatus(escrow.id, {
        status: 'RELEASED',
        finalizeTxHash: result.hash,
      });
    } catch (error) {
      throw new EscrowFailedError(error instanceof Error ? error.message : String(error));
    }
  }

  /** Refunds the caller's locked escrow back to themselves. Only the escrow's payer may do this. */
  async refundForUser(userId: string, escrowId: string): Promise<EscrowRecord> {
    const escrow = await this.getOwnedEscrow(userId, escrowId);
    if (escrow.status !== 'LOCKED' || !escrow.onChainEscrowId) {
      throw new EscrowFailedError(`Escrow ${escrowId} is not in a refundable state`);
    }

    const account = await this.stellarAccountRepository.findById(escrow.payerStellarAccountId);
    if (!account) {
      throw new NotFoundException('Stellar account not found');
    }
    const wallet = KeypairWallet.fromSecret(
      account.network,
      decryptSecretKey(account.encryptedSecretKey, this.walletEncryptionKey()),
    );

    try {
      const result = await refundEscrow({
        client: this.stellarClient,
        contractId: this.escrowContractId(),
        escrowId: BigInt(escrow.onChainEscrowId),
        submitterWallet: wallet,
      });
      return await this.escrowRepository.updateStatus(escrow.id, {
        status: 'REFUNDED',
        finalizeTxHash: result.hash,
      });
    } catch (error) {
      throw new EscrowFailedError(error instanceof Error ? error.message : String(error));
    }
  }

  async getEscrowForUser(userId: string, escrowId: string): Promise<EscrowRecord> {
    return this.getOwnedEscrow(userId, escrowId);
  }

  private async getOwnedEscrow(userId: string, escrowId: string): Promise<EscrowRecord> {
    const escrow = await this.escrowRepository.findById(escrowId);
    if (!escrow) {
      throw new NotFoundException('Escrow not found');
    }
    const account = await this.stellarAccountRepository.findById(escrow.payerStellarAccountId);
    if (!account || account.userId !== userId) {
      throw new ForbiddenException('You do not have access to this escrow');
    }
    return escrow;
  }

  private escrowContractId(): string {
    return this.configService.getOrThrow<string>('stellarEscrowContractId');
  }

  private walletEncryptionKey(): string {
    return this.configService.getOrThrow<string>('walletEncryptionKey');
  }
}
