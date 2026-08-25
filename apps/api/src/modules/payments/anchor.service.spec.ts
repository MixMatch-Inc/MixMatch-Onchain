import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { Keypair, Networks } from '@stellar/stellar-sdk';
import type { DefaultStellarClient } from '@mixmatch/stellar';
import { encryptSecretKey } from './wallet-encryption';
import { AnchorError, AnchorService } from './anchor.service';
import {
  AnchorTransactionRepository,
  type AnchorTransactionRecord,
} from './anchor-transaction.repository';
import {
  StellarAccountRepository,
  type StellarAccountRecord,
} from './stellar-account.repository';
import type { PaymentsService } from './payments.service';

const ENCRYPTION_KEY = 'ab'.repeat(32);
const REAL_TESTNET_SECRET = Keypair.random().secret();
const HOME_DOMAIN = 'testanchor.stellar.org';

const CONFIG_VALUES: Record<string, unknown> = {
  walletEncryptionKey: ENCRYPTION_KEY,
  anchorHomeDomain: HOME_DOMAIN,
};

interface FakeToml {
  signingKey?: string;
  webAuthEndpoint?: string;
  transferServerSep24?: string;
  currencies: Array<{ code: string; issuer?: string }>;
}

interface FakeSep24Transaction {
  id: string;
  kind: 'deposit' | 'withdrawal';
  status: string;
  amountIn: string | null;
  amountOut: string | null;
  startedAt: string;
  completedAt: string | null;
  moreInfoUrl: string | null;
  stellarTransactionId: string | null;
  externalTransactionId: string | null;
  message: string | null;
}

const fetchStellarTomlMock = jest.fn<Promise<FakeToml>, [string]>();
const authenticateSep10Mock = jest.fn<Promise<string>, [unknown]>();
const initiateSep24DepositMock = jest.fn<
  Promise<{ type: string; url: string; id: string }>,
  [unknown]
>();
const initiateSep24WithdrawMock = jest.fn<
  Promise<{ type: string; url: string; id: string }>,
  [unknown]
>();
const getSep24TransactionMock = jest.fn<
  Promise<FakeSep24Transaction>,
  [unknown]
>();

jest.mock('@mixmatch/stellar', () => {
  const actual: object = jest.requireActual('@mixmatch/stellar');
  return {
    ...actual,
    fetchStellarToml: (homeDomain: string) => fetchStellarTomlMock(homeDomain),
    authenticateSep10: (params: unknown) => authenticateSep10Mock(params),
    initiateSep24Deposit: (params: unknown) => initiateSep24DepositMock(params),
    initiateSep24Withdraw: (params: unknown) =>
      initiateSep24WithdrawMock(params),
    getSep24Transaction: (params: unknown) => getSep24TransactionMock(params),
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

function buildToml(overrides: Partial<FakeToml> = {}): FakeToml {
  return {
    signingKey: Keypair.random().publicKey(),
    webAuthEndpoint: `https://${HOME_DOMAIN}/auth`,
    transferServerSep24: `https://${HOME_DOMAIN}/sep24`,
    currencies: [{ code: 'SRT' }],
    ...overrides,
  };
}

function buildSep24Transaction(
  overrides: Partial<FakeSep24Transaction> = {},
): FakeSep24Transaction {
  return {
    id: 'sep24-tx-1',
    kind: 'deposit',
    status: 'incomplete',
    amountIn: null,
    amountOut: null,
    startedAt: '2026-01-01T00:00:00.000Z',
    completedAt: null,
    moreInfoUrl: null,
    stellarTransactionId: null,
    externalTransactionId: null,
    message: null,
    ...overrides,
  };
}

function buildAnchorTransaction(
  overrides: Partial<AnchorTransactionRecord> = {},
): AnchorTransactionRecord {
  return {
    id: 'anchor-tx-1',
    stellarAccountId: 'account-1',
    kind: 'deposit',
    assetCode: 'SRT',
    homeDomain: HOME_DOMAIN,
    sep24TransactionId: 'sep24-tx-1',
    status: 'incomplete',
    interactiveUrl: 'https://anchor/kyc',
    moreInfoUrl: null,
    amountIn: null,
    amountOut: null,
    stellarTransactionId: null,
    externalTransactionId: null,
    message: null,
    startedAt: new Date(),
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('AnchorService', () => {
  let service: AnchorService;
  let anchorTransactionRepository: Record<string, jest.Mock>;
  let stellarAccountRepository: Record<string, jest.Mock>;
  let paymentsService: { getOrCreateStellarAccount: jest.Mock };

  beforeEach(() => {
    fetchStellarTomlMock.mockReset();
    authenticateSep10Mock.mockReset();
    initiateSep24DepositMock.mockReset();
    initiateSep24WithdrawMock.mockReset();
    getSep24TransactionMock.mockReset();

    anchorTransactionRepository = {
      findById: jest.fn(),
      create: jest.fn(),
      updateFromAnchor: jest.fn(),
      listByStellarAccountId: jest.fn(),
      findInProgressByStellarAccountId: jest.fn().mockResolvedValue([]),
    };
    stellarAccountRepository = {
      findByUserId: jest.fn(),
      findById: jest.fn(),
    };
    paymentsService = { getOrCreateStellarAccount: jest.fn() };

    service = new AnchorService(
      anchorTransactionRepository as unknown as AnchorTransactionRepository,
      stellarAccountRepository as unknown as StellarAccountRepository,
      paymentsService as unknown as PaymentsService,
      {
        networkPassphrase: Networks.TESTNET,
      } as unknown as DefaultStellarClient,
      {
        getOrThrow: jest.fn((key: string) => CONFIG_VALUES[key]),
      } as unknown as ConfigService,
    );
  });

  describe('depositForUser', () => {
    it('runs SEP-10 auth, initiates a SEP-24 deposit, and persists the resulting transaction', async () => {
      paymentsService.getOrCreateStellarAccount.mockResolvedValue(
        buildAccount(),
      );
      fetchStellarTomlMock.mockResolvedValue(buildToml());
      authenticateSep10Mock.mockResolvedValue('jwt-token');
      initiateSep24DepositMock.mockResolvedValue({
        type: 'interactive_customer_info_needed',
        url: 'https://anchor/kyc',
        id: 'sep24-tx-1',
      });
      getSep24TransactionMock.mockResolvedValue(buildSep24Transaction());
      anchorTransactionRepository.create.mockResolvedValue(
        buildAnchorTransaction(),
      );

      const result = await service.depositForUser('user-1', {
        assetCode: 'SRT',
        amount: '10',
      });

      expect(result.interactiveUrl).toBe('https://anchor/kyc');
      expect(initiateSep24DepositMock).toHaveBeenCalledWith(
        expect.objectContaining({
          jwt: 'jwt-token',
          assetCode: 'SRT',
          amount: '10',
        }),
      );
      expect(anchorTransactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'deposit',
          assetCode: 'SRT',
          homeDomain: HOME_DOMAIN,
          sep24TransactionId: 'sep24-tx-1',
          interactiveUrl: 'https://anchor/kyc',
          status: 'incomplete',
        }),
      );
    });

    it('throws AnchorError when the anchor is missing required SEP-1 fields', async () => {
      paymentsService.getOrCreateStellarAccount.mockResolvedValue(
        buildAccount(),
      );
      fetchStellarTomlMock.mockResolvedValue(
        buildToml({ webAuthEndpoint: undefined }),
      );

      await expect(
        service.depositForUser('user-1', { assetCode: 'SRT' }),
      ).rejects.toBeInstanceOf(AnchorError);
      expect(anchorTransactionRepository.create).not.toHaveBeenCalled();
    });

    it('wraps a SEP-10/SEP-24 network failure as AnchorError', async () => {
      paymentsService.getOrCreateStellarAccount.mockResolvedValue(
        buildAccount(),
      );
      fetchStellarTomlMock.mockResolvedValue(buildToml());
      authenticateSep10Mock.mockRejectedValue(new Error('anchor unreachable'));

      await expect(
        service.depositForUser('user-1', { assetCode: 'SRT' }),
      ).rejects.toBeInstanceOf(AnchorError);
    });
  });

  describe('withdrawForUser', () => {
    it('initiates a SEP-24 withdrawal', async () => {
      paymentsService.getOrCreateStellarAccount.mockResolvedValue(
        buildAccount(),
      );
      fetchStellarTomlMock.mockResolvedValue(buildToml());
      authenticateSep10Mock.mockResolvedValue('jwt-token');
      initiateSep24WithdrawMock.mockResolvedValue({
        type: 'interactive_customer_info_needed',
        url: 'https://anchor/withdraw',
        id: 'sep24-tx-2',
      });
      getSep24TransactionMock.mockResolvedValue(
        buildSep24Transaction({ id: 'sep24-tx-2', kind: 'withdrawal' }),
      );
      anchorTransactionRepository.create.mockResolvedValue(
        buildAnchorTransaction({
          kind: 'withdrawal',
          sep24TransactionId: 'sep24-tx-2',
        }),
      );

      const result = await service.withdrawForUser('user-1', {
        assetCode: 'SRT',
      });

      expect(result.interactiveUrl).toBe('https://anchor/withdraw');
      expect(initiateSep24WithdrawMock).toHaveBeenCalled();
      expect(initiateSep24DepositMock).not.toHaveBeenCalled();
    });
  });

  describe('getStatusForUser', () => {
    it('returns the stored transaction as-is when its status is terminal', async () => {
      const transaction = buildAnchorTransaction({ status: 'completed' });
      anchorTransactionRepository.findById.mockResolvedValue(transaction);
      stellarAccountRepository.findById.mockResolvedValue(buildAccount());

      const result = await service.getStatusForUser('user-1', 'anchor-tx-1');

      expect(result).toBe(transaction);
      expect(fetchStellarTomlMock).not.toHaveBeenCalled();
    });

    it('re-polls the anchor and updates the record when still in progress', async () => {
      const transaction = buildAnchorTransaction({
        status: 'pending_user_transfer_start',
      });
      anchorTransactionRepository.findById.mockResolvedValue(transaction);
      stellarAccountRepository.findById.mockResolvedValue(buildAccount());
      fetchStellarTomlMock.mockResolvedValue(buildToml());
      authenticateSep10Mock.mockResolvedValue('jwt-token');
      getSep24TransactionMock.mockResolvedValue(
        buildSep24Transaction({
          status: 'completed',
          amountIn: '10.0000000',
          amountOut: '9.9000000',
        }),
      );
      anchorTransactionRepository.updateFromAnchor.mockResolvedValue(
        buildAnchorTransaction({ status: 'completed' }),
      );

      const result = await service.getStatusForUser('user-1', 'anchor-tx-1');

      expect(result.status).toBe('completed');
      expect(anchorTransactionRepository.updateFromAnchor).toHaveBeenCalledWith(
        'anchor-tx-1',
        expect.objectContaining({
          status: 'completed',
          amountIn: '10.0000000',
          amountOut: '9.9000000',
        }),
      );
    });

    it('throws NotFoundException for a transaction that does not exist', async () => {
      anchorTransactionRepository.findById.mockResolvedValue(null);

      await expect(
        service.getStatusForUser('user-1', 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when the transaction belongs to another user', async () => {
      anchorTransactionRepository.findById.mockResolvedValue(
        buildAnchorTransaction(),
      );
      stellarAccountRepository.findById.mockResolvedValue(
        buildAccount({ userId: 'someone-else' }),
      );

      await expect(
        service.getStatusForUser('user-1', 'anchor-tx-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('listHistoryForUser', () => {
    it('returns an empty page when the caller has no Stellar account yet', async () => {
      stellarAccountRepository.findByUserId.mockResolvedValue(null);

      const result = await service.listHistoryForUser('user-1', 1, 20);

      expect(result).toEqual({ transactions: [], total: 0 });
    });

    it('opportunistically re-polls in-progress transactions before listing', async () => {
      stellarAccountRepository.findByUserId.mockResolvedValue(buildAccount());
      const inProgress = buildAnchorTransaction({ status: 'pending_anchor' });
      anchorTransactionRepository.findInProgressByStellarAccountId.mockResolvedValue(
        [inProgress],
      );
      stellarAccountRepository.findById.mockResolvedValue(buildAccount());
      fetchStellarTomlMock.mockResolvedValue(buildToml());
      authenticateSep10Mock.mockResolvedValue('jwt-token');
      getSep24TransactionMock.mockResolvedValue(
        buildSep24Transaction({ status: 'completed' }),
      );
      anchorTransactionRepository.updateFromAnchor.mockResolvedValue(
        buildAnchorTransaction({ status: 'completed' }),
      );
      anchorTransactionRepository.listByStellarAccountId.mockResolvedValue({
        transactions: [buildAnchorTransaction({ status: 'completed' })],
        total: 1,
      });

      const result = await service.listHistoryForUser('user-1', 1, 20);

      expect(anchorTransactionRepository.updateFromAnchor).toHaveBeenCalled();
      expect(result.total).toBe(1);
    });
  });
});
