import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { Keypair } from '@stellar/stellar-sdk';
import {
  SorobanInvocationError,
  type DefaultStellarClient,
} from '@mixmatch/stellar';
import { encryptSecretKey } from './wallet-encryption';
import { EscrowFailedError, EscrowService } from './escrow.service';
import {
  DuplicateEscrowIdempotencyKeyError,
  EscrowRepository,
  type EscrowRecord,
} from './escrow.repository';
import {
  StellarAccountRepository,
  type StellarAccountRecord,
} from './stellar-account.repository';
import type { PaymentsService } from './payments.service';

const ENCRYPTION_KEY = 'ab'.repeat(32);
const REAL_TESTNET_SECRET = Keypair.random().secret();
const CONTRACT_ID = 'CABCDEF';

const CONFIG_VALUES: Record<string, unknown> = {
  walletEncryptionKey: ENCRYPTION_KEY,
  stellarEscrowContractId: CONTRACT_ID,
};

type DepositMock = jest.Mock<
  Promise<{ escrowId: bigint; hash: string }>,
  [
    {
      payeePublicKey: string;
      tokenContractId: string;
      amount: string | bigint;
      timeoutLedgers: number;
    },
  ]
>;
type ReleaseMock = jest.Mock<
  Promise<{ hash: string }>,
  [{ escrowId: bigint | number }]
>;
type RefundMock = jest.Mock<
  Promise<{ hash: string }>,
  [{ escrowId: bigint | number }]
>;
type GetEscrowMock = jest.Mock<
  Promise<{
    payer: string;
    payee: string;
    token: string;
    amount: string;
    status: 'Locked' | 'Released' | 'Refunded';
    timeoutLedger: number;
  }>,
  [{ escrowId: bigint | number }]
>;

const depositToEscrowMock: DepositMock = jest.fn<
  Promise<{ escrowId: bigint; hash: string }>,
  [
    {
      payeePublicKey: string;
      tokenContractId: string;
      amount: string | bigint;
      timeoutLedgers: number;
    },
  ]
>();
const releaseEscrowMock: ReleaseMock = jest.fn<
  Promise<{ hash: string }>,
  [{ escrowId: bigint | number }]
>();
const refundEscrowMock: RefundMock = jest.fn<
  Promise<{ hash: string }>,
  [{ escrowId: bigint | number }]
>();
const getEscrowMock: GetEscrowMock = jest.fn<
  Promise<{
    payer: string;
    payee: string;
    token: string;
    amount: string;
    status: 'Locked' | 'Released' | 'Refunded';
    timeoutLedger: number;
  }>,
  [{ escrowId: bigint | number }]
>();

jest.mock('@mixmatch/stellar', () => {
  const actual: object = jest.requireActual('@mixmatch/stellar');
  return {
    ...actual,
    depositToEscrow: (
      ...args: Parameters<DepositMock>
    ): ReturnType<DepositMock> => depositToEscrowMock(...args),
    releaseEscrow: (
      ...args: Parameters<ReleaseMock>
    ): ReturnType<ReleaseMock> => releaseEscrowMock(...args),
    refundEscrow: (...args: Parameters<RefundMock>): ReturnType<RefundMock> =>
      refundEscrowMock(...args),
    getEscrow: (
      ...args: Parameters<GetEscrowMock>
    ): ReturnType<GetEscrowMock> => getEscrowMock(...args),
  };
});

function buildAccount(
  overrides: Partial<StellarAccountRecord> = {},
): StellarAccountRecord {
  return {
    id: 'account-1',
    userId: 'user-1',
    publicKey: 'GABCDEF',
    encryptedSecretKey: encryptSecretKey(REAL_TESTNET_SECRET, ENCRYPTION_KEY),
    network: 'testnet',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildEscrow(overrides: Partial<EscrowRecord> = {}): EscrowRecord {
  return {
    id: 'escrow-1',
    idempotencyKey: 'key-1',
    payerStellarAccountId: 'account-1',
    payeePublicKey: 'GPAYEE',
    tokenContractId: 'CTOKEN',
    amount: '5000000',
    onChainEscrowId: null,
    timeoutLedger: null,
    status: 'PENDING',
    depositTxHash: null,
    finalizeTxHash: null,
    failureCode: null,
    failureReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('EscrowService', () => {
  let service: EscrowService;
  let escrowRepository: Record<string, jest.Mock>;
  let stellarAccountRepository: Record<string, jest.Mock>;
  let paymentsService: { getOrCreateStellarAccount: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    escrowRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByIdempotencyKey: jest.fn(),
      updateStatus: jest.fn(),
    };
    stellarAccountRepository = {
      findById: jest.fn(),
    };
    paymentsService = {
      getOrCreateStellarAccount: jest.fn(),
    };

    service = new EscrowService(
      escrowRepository as unknown as EscrowRepository,
      stellarAccountRepository as unknown as StellarAccountRepository,
      paymentsService as unknown as PaymentsService,
      {} as unknown as DefaultStellarClient,
      {
        getOrThrow: jest.fn((key: string) => CONFIG_VALUES[key]),
      } as unknown as ConfigService,
    );
  });

  describe('depositForUser', () => {
    it('locks the escrow and persists the on-chain id, timeout, and deposit hash', async () => {
      paymentsService.getOrCreateStellarAccount.mockResolvedValue(
        buildAccount(),
      );
      escrowRepository.create.mockResolvedValue(buildEscrow());
      depositToEscrowMock.mockResolvedValue({
        escrowId: 7n,
        hash: 'deposit-hash',
      });
      getEscrowMock.mockResolvedValue({
        payer: 'GABCDEF',
        payee: 'GPAYEE',
        token: 'CTOKEN',
        amount: '5000000',
        status: 'Locked',
        timeoutLedger: 999,
      });
      escrowRepository.updateStatus.mockImplementation(
        (_id: string, update: object) => buildEscrow({ ...update }),
      );

      const result = await service.depositForUser('user-1', {
        payeePublicKey: 'GPAYEE',
        tokenContractId: 'CTOKEN',
        amount: '5000000',
        timeoutLedgers: 100,
      });

      expect(result.status).toBe('LOCKED');
      expect(escrowRepository.updateStatus).toHaveBeenCalledWith(
        'escrow-1',
        expect.objectContaining({
          status: 'LOCKED',
          onChainEscrowId: '7',
          timeoutLedger: 999,
          depositTxHash: 'deposit-hash',
        }),
      );
    });

    it('marks the escrow FAILED and throws when the Soroban deposit fails', async () => {
      paymentsService.getOrCreateStellarAccount.mockResolvedValue(
        buildAccount(),
      );
      escrowRepository.create.mockResolvedValue(buildEscrow());
      depositToEscrowMock.mockRejectedValue(
        new SorobanInvocationError('deposit rejected', undefined),
      );
      escrowRepository.updateStatus.mockResolvedValue(
        buildEscrow({ status: 'FAILED' }),
      );

      await expect(
        service.depositForUser('user-1', {
          payeePublicKey: 'GPAYEE',
          tokenContractId: 'CTOKEN',
          amount: '5000000',
          timeoutLedgers: 100,
        }),
      ).rejects.toBeInstanceOf(EscrowFailedError);

      expect(escrowRepository.updateStatus).toHaveBeenCalledWith(
        'escrow-1',
        expect.objectContaining({
          status: 'FAILED',
          failureCode: 'soroban_invocation_failed',
        }),
      );
    });

    it('returns the existing escrow on a duplicate idempotency key instead of depositing twice', async () => {
      paymentsService.getOrCreateStellarAccount.mockResolvedValue(
        buildAccount(),
      );
      escrowRepository.create.mockRejectedValue(
        new DuplicateEscrowIdempotencyKeyError('key-1'),
      );
      const existing = buildEscrow({ status: 'LOCKED', onChainEscrowId: '3' });
      escrowRepository.findByIdempotencyKey.mockResolvedValue(existing);

      const result = await service.depositForUser('user-1', {
        payeePublicKey: 'GPAYEE',
        tokenContractId: 'CTOKEN',
        amount: '5000000',
        timeoutLedgers: 100,
        idempotencyKey: 'key-1',
      });

      expect(result).toBe(existing);
      expect(depositToEscrowMock).not.toHaveBeenCalled();
    });
  });

  describe('releaseForUser', () => {
    it('releases a locked, owned escrow and marks it RELEASED', async () => {
      const escrow = buildEscrow({ status: 'LOCKED', onChainEscrowId: '7' });
      escrowRepository.findById.mockResolvedValue(escrow);
      stellarAccountRepository.findById.mockResolvedValue(buildAccount());
      releaseEscrowMock.mockResolvedValue({ hash: 'release-hash' });
      escrowRepository.updateStatus.mockResolvedValue(
        buildEscrow({ status: 'RELEASED' }),
      );

      const result = await service.releaseForUser('user-1', 'escrow-1');

      expect(result.status).toBe('RELEASED');
      expect(escrowRepository.updateStatus).toHaveBeenCalledWith(
        'escrow-1',
        expect.objectContaining({
          status: 'RELEASED',
          finalizeTxHash: 'release-hash',
        }),
      );
    });

    it('throws ForbiddenException when the escrow belongs to another user', async () => {
      escrowRepository.findById.mockResolvedValue(
        buildEscrow({ status: 'LOCKED', onChainEscrowId: '7' }),
      );
      stellarAccountRepository.findById.mockResolvedValue(
        buildAccount({ userId: 'someone-else' }),
      );

      await expect(
        service.releaseForUser('user-1', 'escrow-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws NotFoundException for an escrow that does not exist', async () => {
      escrowRepository.findById.mockResolvedValue(null);

      await expect(
        service.releaseForUser('user-1', 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuses to release an escrow that is not LOCKED', async () => {
      escrowRepository.findById.mockResolvedValue(
        buildEscrow({ status: 'REFUNDED', onChainEscrowId: '7' }),
      );
      stellarAccountRepository.findById.mockResolvedValue(buildAccount());

      await expect(
        service.releaseForUser('user-1', 'escrow-1'),
      ).rejects.toBeInstanceOf(EscrowFailedError);
      expect(releaseEscrowMock).not.toHaveBeenCalled();
    });
  });

  describe('refundForUser', () => {
    it('refunds a locked, owned escrow and marks it REFUNDED', async () => {
      const escrow = buildEscrow({ status: 'LOCKED', onChainEscrowId: '7' });
      escrowRepository.findById.mockResolvedValue(escrow);
      stellarAccountRepository.findById.mockResolvedValue(buildAccount());
      refundEscrowMock.mockResolvedValue({ hash: 'refund-hash' });
      escrowRepository.updateStatus.mockResolvedValue(
        buildEscrow({ status: 'REFUNDED' }),
      );

      const result = await service.refundForUser('user-1', 'escrow-1');

      expect(result.status).toBe('REFUNDED');
      expect(escrowRepository.updateStatus).toHaveBeenCalledWith(
        'escrow-1',
        expect.objectContaining({
          status: 'REFUNDED',
          finalizeTxHash: 'refund-hash',
        }),
      );
    });
  });

  describe('getEscrowForUser', () => {
    it('returns the escrow when owned by the caller', async () => {
      const escrow = buildEscrow();
      escrowRepository.findById.mockResolvedValue(escrow);
      stellarAccountRepository.findById.mockResolvedValue(buildAccount());

      const result = await service.getEscrowForUser('user-1', 'escrow-1');

      expect(result).toBe(escrow);
    });
  });
});
