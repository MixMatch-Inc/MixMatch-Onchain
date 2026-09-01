import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { WalletResolver } from './wallet-resolver';
import { Keypair } from '@stellar/stellar-sdk';
import {
  StellarPaymentError,
  type DefaultStellarClient,
  type StellarPaymentService as StellarPaymentEngine,
} from '@mixmatch/stellar';

type EstablishTrustlineFn = (input: {
  asset: { code: string; issuer: string };
}) => Promise<{ hash: string; ledger: number }>;

const establishTrustlineMock = jest.fn<
  Promise<{ hash: string; ledger: number }>,
  [{ asset: { code: string; issuer: string } }]
>();

interface FakePathQuote {
  mode: 'strictSend' | 'strictReceive';
  sourceAsset?: { code: string; issuer: string };
  destAsset?: { code: string; issuer: string };
  sourceAmount: string;
  destAmount: string;
  path: unknown[];
}

type FindPathFn = (input: {
  sourceAsset?: { code: string; issuer: string };
  destAsset?: { code: string; issuer: string };
  amount: string;
}) => Promise<FakePathQuote | null>;

type SubmitPathPaymentFn = (input: {
  quote: FakePathQuote;
  slippageBps?: number;
}) => Promise<{ hash: string; ledger: number }>;

const findStrictSendPathMock = jest.fn<
  Promise<FakePathQuote | null>,
  Parameters<FindPathFn>
>();
const findStrictReceivePathMock = jest.fn<
  Promise<FakePathQuote | null>,
  Parameters<FindPathFn>
>();
const submitPathPaymentMock = jest.fn<
  Promise<{ hash: string; ledger: number }>,
  Parameters<SubmitPathPaymentFn>
>();

type ConfigureMultisigFn = (input: {
  adminPublicKey: string;
}) => Promise<{ hash: string; ledger: number }>;
type BuildHighValuePaymentEnvelopeFn = (input: {
  amount: string;
}) => Promise<{ envelopeXdr: string }>;
type CoSignAndSubmitEnvelopeFn = (input: {
  envelopeXdr: string;
}) => Promise<{ hash: string; ledger: number }>;

const configureMultisigMock = jest.fn<
  Promise<{ hash: string; ledger: number }>,
  Parameters<ConfigureMultisigFn>
>();
const buildHighValuePaymentEnvelopeMock = jest.fn<
  Promise<{ envelopeXdr: string }>,
  Parameters<BuildHighValuePaymentEnvelopeFn>
>();
const coSignAndSubmitEnvelopeMock = jest.fn<
  Promise<{ hash: string; ledger: number }>,
  Parameters<CoSignAndSubmitEnvelopeFn>
>();

interface FakeStreamEvent {
  type: string;
  to?: string;
  amount?: string;
  assetType?: string;
  assetCode?: string;
  assetIssuer?: string;
  transactionHash: string;
  createdAt: string;
}

interface FakeStreamParams {
  accountPublicKey: string;
  onEvent: (event: FakeStreamEvent) => void;
}

type StreamAccountPaymentsFn = (params: FakeStreamParams) => {
  close: () => void;
};

const streamAccountPaymentsMock = jest.fn<
  { close: () => void },
  Parameters<StreamAccountPaymentsFn>
>();

jest.mock('@mixmatch/stellar', () => {
  const actual: object = jest.requireActual('@mixmatch/stellar');
  const establishTrustline: EstablishTrustlineFn = (input) =>
    establishTrustlineMock(input);
  const findStrictSendPath: FindPathFn = (input) =>
    findStrictSendPathMock(input);
  const findStrictReceivePath: FindPathFn = (input) =>
    findStrictReceivePathMock(input);
  const submitPathPayment: SubmitPathPaymentFn = (input) =>
    submitPathPaymentMock(input);
  const configureMultisig: ConfigureMultisigFn = (input) =>
    configureMultisigMock(input);
  const buildHighValuePaymentEnvelope: BuildHighValuePaymentEnvelopeFn = (
    input,
  ) => buildHighValuePaymentEnvelopeMock(input);
  const coSignAndSubmitEnvelope: CoSignAndSubmitEnvelopeFn = (input) =>
    coSignAndSubmitEnvelopeMock(input);
  const streamAccountPayments: StreamAccountPaymentsFn = (params) =>
    streamAccountPaymentsMock(params);
  return {
    ...actual,
    establishTrustline,
    findStrictSendPath,
    findStrictReceivePath,
    submitPathPayment,
    configureMultisig,
    buildHighValuePaymentEnvelope,
    coSignAndSubmitEnvelope,
    streamAccountPayments,
  };
});
import { encryptSecretKey } from './wallet-encryption';
import { PaymentFailedError } from './payment-errors';
import { PaymentsService } from './payments.service';
import { AdminAuditRepository } from './admin-audit.repository';
import {
  DuplicateIdempotencyKeyError,
  TransactionRepository,
  type TransactionRecord,
} from './transaction.repository';
import {
  StellarAccountRepository,
  type StellarAccountRecord,
} from './stellar-account.repository';

const ENCRYPTION_KEY = 'ab'.repeat(32);
const REAL_TESTNET_SECRET = Keypair.random().secret();
const RECONCILIATION_STALE_MS = 2 * 60 * 1000;
const RECONCILIATION_ESCALATION_MS = 24 * 60 * 60 * 1000;

const CONFIG_VALUES: Record<string, unknown> = {
  walletEncryptionKey: ENCRYPTION_KEY,
  reconciliationStaleMs: RECONCILIATION_STALE_MS,
  reconciliationEscalationMs: RECONCILIATION_ESCALATION_MS,
};

function buildAccount(
  overrides: Partial<StellarAccountRecord> = {},
): StellarAccountRecord {
  return {
    id: 'account-1',
    userId: 'user-1',
    publicKey: 'GABCDEF',
    encryptedSecretKey: encryptSecretKey(REAL_TESTNET_SECRET, ENCRYPTION_KEY),
    signingKeyId: null,
    network: 'testnet',
    multisigConfigured: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function buildTransaction(
  overrides: Partial<TransactionRecord> = {},
): TransactionRecord {
  return {
    id: 'tx-1',
    idempotencyKey: 'key-1',
    stellarAccountId: 'account-1',
    destinationPublicKey: 'GDEST',
    amount: '10.0000000',
    memo: null,
    assetCode: null,
    assetIssuer: null,
    receiveAssetCode: null,
    receiveAssetIssuer: null,
    destAmount: null,
    pendingEnvelopeXdr: null,
    status: 'PENDING',
    stellarTxHash: null,
    failureCode: null,
    failureReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/** The admin whose id is recorded against each approve/reject decision. */
const ADMIN_USER_ID = 'admin-user-1';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let stellarAccountRepository: Record<string, jest.Mock>;
  let transactionRepository: Record<string, jest.Mock>;
  let paymentEngine: { submitPayment: jest.Mock };
  let adminAuditRepository: { record: jest.Mock };
  let stellarClient: {
    getNetwork: jest.Mock;
    horizon: Record<string, jest.Mock>;
  };

  beforeEach(() => {
    establishTrustlineMock.mockReset();
    findStrictSendPathMock.mockReset();
    findStrictReceivePathMock.mockReset();
    submitPathPaymentMock.mockReset();
    configureMultisigMock.mockReset();
    buildHighValuePaymentEnvelopeMock.mockReset();
    coSignAndSubmitEnvelopeMock.mockReset();
    streamAccountPaymentsMock.mockReset();
    stellarAccountRepository = {
      findByUserId: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      markMultisigConfigured: jest.fn(),
    };
    transactionRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByIdempotencyKey: jest.fn(),
      updateStatus: jest.fn(),
      listByStellarAccountId: jest.fn(),
      findStalePending: jest.fn(),
      findPendingByStellarAccountId: jest.fn().mockResolvedValue([]),
    };
    paymentEngine = { submitPayment: jest.fn() };
    adminAuditRepository = { record: jest.fn().mockResolvedValue({}) };
    stellarClient = {
      getNetwork: jest.fn().mockReturnValue('testnet'),
      horizon: { friendbot: jest.fn() },
    };

    const configService = {
      getOrThrow: jest.fn((key: string) => CONFIG_VALUES[key]),
      get: jest.fn((key: string) => CONFIG_VALUES[key]),
    } as unknown as ConfigService;

    service = new PaymentsService(
      stellarAccountRepository as unknown as StellarAccountRepository,
      transactionRepository as unknown as TransactionRepository,
      stellarClient as unknown as DefaultStellarClient,
      paymentEngine as unknown as StellarPaymentEngine,
      configService,
      new WalletResolver(configService),
      adminAuditRepository as unknown as AdminAuditRepository,
    );
  });

  describe('sendPayment', () => {
    it('sends a payment and marks the transaction SUCCESS', async () => {
      stellarAccountRepository.findByUserId.mockResolvedValue(buildAccount());
      transactionRepository.create.mockResolvedValue(buildTransaction());
      paymentEngine.submitPayment.mockResolvedValue({
        hash: 'tx-hash',
        ledger: 1,
      });
      transactionRepository.updateStatus.mockImplementation(
        (_id: string, update: object) => buildTransaction({ ...update }),
      );

      const result = await service.sendPayment('user-1', {
        destinationPublicKey: 'GDEST',
        amount: '10',
      });

      expect(result.status).toBe('SUCCESS');
      expect(result.stellarTxHash).toBe('tx-hash');
    });

    it('marks the transaction FAILED and throws when Stellar submission fails', async () => {
      stellarAccountRepository.findByUserId.mockResolvedValue(buildAccount());
      transactionRepository.create.mockResolvedValue(buildTransaction());
      paymentEngine.submitPayment.mockRejectedValue(
        new StellarPaymentError('insufficient_balance', 'not enough funds'),
      );
      transactionRepository.updateStatus.mockResolvedValue(
        buildTransaction({ status: 'FAILED' }),
      );

      await expect(
        service.sendPayment('user-1', {
          destinationPublicKey: 'GDEST',
          amount: '10',
        }),
      ).rejects.toBeInstanceOf(PaymentFailedError);
      expect(transactionRepository.updateStatus).toHaveBeenCalledWith(
        'tx-1',
        expect.objectContaining({
          status: 'FAILED',
          failureCode: 'insufficient_balance',
        }),
      );
    });

    it('returns the existing transaction on a duplicate idempotency key instead of resubmitting', async () => {
      stellarAccountRepository.findByUserId.mockResolvedValue(buildAccount());
      transactionRepository.create.mockRejectedValue(
        new DuplicateIdempotencyKeyError('key-1'),
      );
      const existing = buildTransaction({
        status: 'SUCCESS',
        stellarTxHash: 'already-done',
      });
      transactionRepository.findByIdempotencyKey.mockResolvedValue(existing);

      const result = await service.sendPayment('user-1', {
        destinationPublicKey: 'GDEST',
        amount: '10',
        idempotencyKey: 'key-1',
      });

      expect(result).toBe(existing);
      expect(paymentEngine.submitPayment).not.toHaveBeenCalled();
    });

    it('provisions a Stellar account on first use and funds it via Friendbot on testnet', async () => {
      stellarAccountRepository.findByUserId.mockResolvedValue(null);
      stellarAccountRepository.create.mockResolvedValue(buildAccount());
      transactionRepository.create.mockResolvedValue(buildTransaction());
      paymentEngine.submitPayment.mockResolvedValue({
        hash: 'h',
        ledger: 1,
      });
      transactionRepository.updateStatus.mockResolvedValue(
        buildTransaction({ status: 'SUCCESS' }),
      );
      const friendbotCall = jest.fn().mockResolvedValue(undefined);
      stellarClient.horizon.friendbot.mockReturnValue({ call: friendbotCall });

      await service.sendPayment('user-1', {
        destinationPublicKey: 'GDEST',
        amount: '10',
      });

      expect(stellarAccountRepository.create).toHaveBeenCalled();
      expect(friendbotCall).toHaveBeenCalled();
    });

    it('sends a non-native asset payment, passing the asset through to the engine and persisting it', async () => {
      stellarAccountRepository.findByUserId.mockResolvedValue(buildAccount());
      transactionRepository.create.mockResolvedValue(
        buildTransaction({ assetCode: 'USDC', assetIssuer: 'GISSUER' }),
      );
      paymentEngine.submitPayment.mockResolvedValue({
        hash: 'tx-hash',
        ledger: 1,
      });
      transactionRepository.updateStatus.mockImplementation(
        (_id: string, update: object) => buildTransaction({ ...update }),
      );

      const result = await service.sendPayment('user-1', {
        destinationPublicKey: 'GDEST',
        amount: '10',
        assetCode: 'USDC',
        assetIssuer: 'GISSUER',
      });

      expect(result.status).toBe('SUCCESS');
      expect(transactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          assetCode: 'USDC',
          assetIssuer: 'GISSUER',
        }),
      );
      expect(paymentEngine.submitPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          asset: { code: 'USDC', issuer: 'GISSUER' },
        }),
      );
    });
  });

  describe('sendPayment (path payments)', () => {
    it('resolves a strictSend quote, submits the path payment, and persists the destAmount/receive asset', async () => {
      stellarAccountRepository.findByUserId.mockResolvedValue(buildAccount());
      findStrictSendPathMock.mockResolvedValue({
        mode: 'strictSend',
        sourceAsset: undefined,
        destAsset: { code: 'MMX', issuer: 'GISSUER' },
        sourceAmount: '10',
        destAmount: '19.8',
        path: [],
      });
      transactionRepository.create.mockResolvedValue(
        buildTransaction({
          amount: '10',
          receiveAssetCode: 'MMX',
          receiveAssetIssuer: 'GISSUER',
          destAmount: '19.8',
        }),
      );
      submitPathPaymentMock.mockResolvedValue({ hash: 'path-hash', ledger: 3 });
      transactionRepository.updateStatus.mockImplementation(
        (_id: string, update: object) => buildTransaction({ ...update }),
      );

      const result = await service.sendPayment('user-1', {
        destinationPublicKey: 'GDEST',
        amount: '10',
        receiveAssetCode: 'MMX',
        receiveAssetIssuer: 'GISSUER',
      });

      expect(result.status).toBe('SUCCESS');
      expect(result.stellarTxHash).toBe('path-hash');
      expect(transactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: '10',
          receiveAssetCode: 'MMX',
          receiveAssetIssuer: 'GISSUER',
          destAmount: '19.8',
        }),
      );
      const submittedQuote = submitPathPaymentMock.mock.calls[0]?.[0].quote;
      expect(submittedQuote).toMatchObject({
        mode: 'strictSend',
        sourceAmount: '10',
        destAmount: '19.8',
      });
    });

    it('resolves a strictReceive quote, treating amount as the destination amount and quote.sourceAmount as what is actually sent', async () => {
      stellarAccountRepository.findByUserId.mockResolvedValue(buildAccount());
      findStrictReceivePathMock.mockResolvedValue({
        mode: 'strictReceive',
        sourceAsset: undefined,
        destAsset: { code: 'MMX', issuer: 'GISSUER' },
        sourceAmount: '10.2',
        destAmount: '20',
        path: [],
      });
      transactionRepository.create.mockResolvedValue(
        buildTransaction({ amount: '10.2', destAmount: '20' }),
      );
      submitPathPaymentMock.mockResolvedValue({ hash: 'h', ledger: 1 });
      transactionRepository.updateStatus.mockImplementation(
        (_id: string, update: object) => buildTransaction({ ...update }),
      );

      await service.sendPayment('user-1', {
        destinationPublicKey: 'GDEST',
        amount: '20',
        receiveAssetCode: 'MMX',
        receiveAssetIssuer: 'GISSUER',
        pathMode: 'strictReceive',
      });

      expect(findStrictReceivePathMock).toHaveBeenCalledWith(
        expect.objectContaining({ amount: '20' }),
      );
      expect(transactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: '10.2', destAmount: '20' }),
      );
    });

    it('throws PaymentFailedError with kind no_payment_path and never creates a transaction row when no path exists', async () => {
      stellarAccountRepository.findByUserId.mockResolvedValue(buildAccount());
      findStrictSendPathMock.mockResolvedValue(null);

      await expect(
        service.sendPayment('user-1', {
          destinationPublicKey: 'GDEST',
          amount: '10',
          receiveAssetCode: 'MMX',
          receiveAssetIssuer: 'GISSUER',
        }),
      ).rejects.toMatchObject({ kind: 'no_payment_path' });

      expect(transactionRepository.create).not.toHaveBeenCalled();
    });

    it('marks the transaction FAILED with kind slippage_exceeded when submission fails due to slippage', async () => {
      stellarAccountRepository.findByUserId.mockResolvedValue(buildAccount());
      findStrictSendPathMock.mockResolvedValue({
        mode: 'strictSend',
        destAsset: { code: 'MMX', issuer: 'GISSUER' },
        sourceAmount: '10',
        destAmount: '19.8',
        path: [],
      });
      transactionRepository.create.mockResolvedValue(
        buildTransaction({ amount: '10', destAmount: '19.8' }),
      );
      submitPathPaymentMock.mockRejectedValue(
        new StellarPaymentError(
          'slippage_exceeded',
          'market moved past tolerance',
        ),
      );
      transactionRepository.updateStatus.mockResolvedValue(
        buildTransaction({ status: 'FAILED' }),
      );

      await expect(
        service.sendPayment('user-1', {
          destinationPublicKey: 'GDEST',
          amount: '10',
          receiveAssetCode: 'MMX',
          receiveAssetIssuer: 'GISSUER',
        }),
      ).rejects.toMatchObject({ kind: 'slippage_exceeded' });

      expect(transactionRepository.updateStatus).toHaveBeenCalledWith(
        'tx-1',
        expect.objectContaining({
          status: 'FAILED',
          failureCode: 'slippage_exceeded',
        }),
      );
    });
  });

  describe('sendPayment (high-value / multisig)', () => {
    const ADMIN_SECRET = Keypair.random().secret();
    const HIGH_VALUE_THRESHOLD_AMOUNT = '1000';

    beforeEach(() => {
      CONFIG_VALUES.adminSigningSecret = ADMIN_SECRET;
      CONFIG_VALUES.highValueThresholdAmount = HIGH_VALUE_THRESHOLD_AMOUNT;
    });

    afterEach(() => {
      delete CONFIG_VALUES.adminSigningSecret;
      delete CONFIG_VALUES.highValueThresholdAmount;
    });

    it('leaves below-threshold payments unaffected — no multisig calls at all', async () => {
      stellarAccountRepository.findByUserId.mockResolvedValue(buildAccount());
      transactionRepository.create.mockResolvedValue(
        buildTransaction({ amount: '10' }),
      );
      paymentEngine.submitPayment.mockResolvedValue({
        hash: 'tx-hash',
        ledger: 1,
      });
      transactionRepository.updateStatus.mockImplementation(
        (_id: string, update: object) => buildTransaction({ ...update }),
      );

      const result = await service.sendPayment('user-1', {
        destinationPublicKey: 'GDEST',
        amount: '10',
      });

      expect(result.status).toBe('SUCCESS');
      expect(configureMultisigMock).not.toHaveBeenCalled();
      expect(buildHighValuePaymentEnvelopeMock).not.toHaveBeenCalled();
      expect(paymentEngine.submitPayment).toHaveBeenCalled();
    });

    it('leaves a payment at exactly the threshold unaffected (strictly greater-than gates it)', async () => {
      stellarAccountRepository.findByUserId.mockResolvedValue(buildAccount());
      transactionRepository.create.mockResolvedValue(
        buildTransaction({ amount: HIGH_VALUE_THRESHOLD_AMOUNT }),
      );
      paymentEngine.submitPayment.mockResolvedValue({
        hash: 'tx-hash',
        ledger: 1,
      });
      transactionRepository.updateStatus.mockImplementation(
        (_id: string, update: object) => buildTransaction({ ...update }),
      );

      await service.sendPayment('user-1', {
        destinationPublicKey: 'GDEST',
        amount: HIGH_VALUE_THRESHOLD_AMOUNT,
      });

      expect(buildHighValuePaymentEnvelopeMock).not.toHaveBeenCalled();
    });

    it("configures multisig on the account's first high-value payment, then builds and persists a PENDING_SIGNATURE envelope without submitting", async () => {
      const account = buildAccount({ multisigConfigured: false });
      stellarAccountRepository.findByUserId.mockResolvedValue(account);
      transactionRepository.findByIdempotencyKey.mockResolvedValue(null);
      configureMultisigMock.mockResolvedValue({
        hash: 'config-hash',
        ledger: 1,
      });
      stellarAccountRepository.markMultisigConfigured.mockResolvedValue(
        buildAccount({ multisigConfigured: true }),
      );
      buildHighValuePaymentEnvelopeMock.mockResolvedValue({
        envelopeXdr: 'envelope-xdr',
      });
      transactionRepository.create.mockResolvedValue(
        buildTransaction({ amount: '5000', status: 'PENDING_SIGNATURE' }),
      );

      const result = await service.sendPayment('user-1', {
        destinationPublicKey: 'GDEST',
        amount: '5000',
      });

      expect(result.status).toBe('PENDING_SIGNATURE');
      expect(configureMultisigMock).toHaveBeenCalledTimes(1);
      expect(
        stellarAccountRepository.markMultisigConfigured,
      ).toHaveBeenCalledWith('account-1');
      expect(buildHighValuePaymentEnvelopeMock).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: '5000',
          destinationPublicKey: 'GDEST',
        }),
      );
      expect(transactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ pendingEnvelopeXdr: 'envelope-xdr' }),
      );
      expect(paymentEngine.submitPayment).not.toHaveBeenCalled();
    });

    it('skips re-configuring multisig when the account is already configured', async () => {
      const account = buildAccount({ multisigConfigured: true });
      stellarAccountRepository.findByUserId.mockResolvedValue(account);
      transactionRepository.findByIdempotencyKey.mockResolvedValue(null);
      buildHighValuePaymentEnvelopeMock.mockResolvedValue({
        envelopeXdr: 'envelope-xdr',
      });
      transactionRepository.create.mockResolvedValue(
        buildTransaction({ amount: '5000', status: 'PENDING_SIGNATURE' }),
      );

      await service.sendPayment('user-1', {
        destinationPublicKey: 'GDEST',
        amount: '5000',
      });

      expect(configureMultisigMock).not.toHaveBeenCalled();
    });

    it('returns the existing transaction on a duplicate idempotency key instead of building a new envelope', async () => {
      stellarAccountRepository.findByUserId.mockResolvedValue(
        buildAccount({ multisigConfigured: true }),
      );
      const existing = buildTransaction({
        status: 'PENDING_SIGNATURE',
        amount: '5000',
      });
      transactionRepository.findByIdempotencyKey.mockResolvedValue(existing);

      const result = await service.sendPayment('user-1', {
        destinationPublicKey: 'GDEST',
        amount: '5000',
        idempotencyKey: 'key-1',
      });

      expect(result).toBe(existing);
      expect(buildHighValuePaymentEnvelopeMock).not.toHaveBeenCalled();
    });
  });

  describe('approvePendingSignature', () => {
    it('co-signs and submits, marking the transaction SUCCESS and clearing the envelope', async () => {
      const pending = buildTransaction({
        status: 'PENDING_SIGNATURE',
        pendingEnvelopeXdr: 'envelope-xdr',
      });
      transactionRepository.findById.mockResolvedValue(pending);
      CONFIG_VALUES.adminSigningSecret = Keypair.random().secret();
      coSignAndSubmitEnvelopeMock.mockResolvedValue({
        hash: 'final-hash',
        ledger: 1,
      });
      transactionRepository.updateStatus.mockResolvedValue(
        buildTransaction({ status: 'SUCCESS', stellarTxHash: 'final-hash' }),
      );

      const result = await service.approvePendingSignature(
        'tx-1',
        ADMIN_USER_ID,
      );

      expect(result.status).toBe('SUCCESS');
      expect(coSignAndSubmitEnvelopeMock).toHaveBeenCalledWith(
        expect.objectContaining({ envelopeXdr: 'envelope-xdr' }),
      );
      expect(transactionRepository.updateStatus).toHaveBeenCalledWith(
        'tx-1',
        expect.objectContaining({
          status: 'SUCCESS',
          stellarTxHash: 'final-hash',
          clearPendingEnvelope: true,
        }),
      );
      delete CONFIG_VALUES.adminSigningSecret;
    });

    it('marks the transaction FAILED when co-signed submission fails (e.g. rejected second signature)', async () => {
      const pending = buildTransaction({
        status: 'PENDING_SIGNATURE',
        pendingEnvelopeXdr: 'envelope-xdr',
      });
      transactionRepository.findById.mockResolvedValue(pending);
      CONFIG_VALUES.adminSigningSecret = Keypair.random().secret();
      coSignAndSubmitEnvelopeMock.mockRejectedValue(
        new StellarPaymentError('malformed_transaction', 'bad auth'),
      );
      transactionRepository.updateStatus.mockResolvedValue(
        buildTransaction({ status: 'FAILED' }),
      );

      await expect(
        service.approvePendingSignature('tx-1', ADMIN_USER_ID),
      ).rejects.toBeInstanceOf(PaymentFailedError);
      expect(transactionRepository.updateStatus).toHaveBeenCalledWith(
        'tx-1',
        expect.objectContaining({
          status: 'FAILED',
          clearPendingEnvelope: true,
        }),
      );
      delete CONFIG_VALUES.adminSigningSecret;
    });

    it('throws when the transaction is not awaiting a signature', async () => {
      transactionRepository.findById.mockResolvedValue(
        buildTransaction({ status: 'SUCCESS' }),
      );

      await expect(
        service.approvePendingSignature('tx-1', ADMIN_USER_ID),
      ).rejects.toBeInstanceOf(PaymentFailedError);
      expect(coSignAndSubmitEnvelopeMock).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for a transaction that does not exist', async () => {
      transactionRepository.findById.mockResolvedValue(null);

      await expect(
        service.approvePendingSignature('missing', ADMIN_USER_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('rejectPendingSignature', () => {
    it('marks the transaction FAILED without ever attempting submission', async () => {
      const pending = buildTransaction({
        status: 'PENDING_SIGNATURE',
        pendingEnvelopeXdr: 'envelope-xdr',
      });
      transactionRepository.findById.mockResolvedValue(pending);
      transactionRepository.updateStatus.mockResolvedValue(
        buildTransaction({ status: 'FAILED', failureCode: 'admin_rejected' }),
      );

      const result = await service.rejectPendingSignature(
        'tx-1',
        ADMIN_USER_ID,
      );

      expect(result.status).toBe('FAILED');
      expect(coSignAndSubmitEnvelopeMock).not.toHaveBeenCalled();
      expect(transactionRepository.updateStatus).toHaveBeenCalledWith(
        'tx-1',
        expect.objectContaining({
          status: 'FAILED',
          failureCode: 'admin_rejected',
          clearPendingEnvelope: true,
        }),
      );
    });
  });

  describe('listPendingSignatures', () => {
    it('returns every transaction awaiting a co-signature', async () => {
      transactionRepository.findPendingSignature = jest
        .fn()
        .mockResolvedValue([buildTransaction({ status: 'PENDING_SIGNATURE' })]);

      const result = await service.listPendingSignatures();

      expect(result).toHaveLength(1);
    });
  });

  describe('streamTransactionUpdates', () => {
    it('completes without starting a Horizon stream when the caller has no Stellar account yet', async () => {
      stellarAccountRepository.findByUserId.mockResolvedValue(null);

      const events: TransactionRecord[] = [];
      let completed = false;
      service.streamTransactionUpdates('user-1').subscribe({
        next: (t) => events.push(t),
        complete: () => {
          completed = true;
        },
      });

      await flushMicrotasks();

      expect(completed).toBe(true);
      expect(events).toEqual([]);
      expect(streamAccountPaymentsMock).not.toHaveBeenCalled();
    });

    it('starts a Horizon stream for the account and emits the matched transaction on a matching event', async () => {
      stellarAccountRepository.findByUserId.mockResolvedValue(buildAccount());
      transactionRepository.findPendingByStellarAccountId.mockResolvedValue([
        buildTransaction({
          id: 'tx-1',
          destinationPublicKey: 'GDEST',
          amount: '10.0000000',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        }),
      ]);
      transactionRepository.updateStatus.mockResolvedValue(
        buildTransaction({
          id: 'tx-1',
          status: 'SUCCESS',
          stellarTxHash: 'stream-hash',
        }),
      );
      const closeMock = jest.fn();
      streamAccountPaymentsMock.mockImplementation((params) => {
        setTimeout(() => {
          params.onEvent({
            type: 'payment',
            to: 'GDEST',
            amount: '10.0000000',
            assetType: 'native',
            transactionHash: 'stream-hash',
            createdAt: '2026-01-01T00:01:00.000Z',
          });
        }, 0);
        return { close: closeMock };
      });

      const events: TransactionRecord[] = [];
      const subscription = service
        .streamTransactionUpdates('user-1')
        .subscribe((t) => events.push(t));

      await flushMicrotasks();
      await new Promise((resolve) => setTimeout(resolve, 0));
      await flushMicrotasks();

      expect(streamAccountPaymentsMock).toHaveBeenCalledWith(
        expect.objectContaining({ accountPublicKey: 'GABCDEF' }),
      );
      expect(
        transactionRepository.findPendingByStellarAccountId,
      ).toHaveBeenCalledTimes(1);
      expect(transactionRepository.updateStatus).toHaveBeenCalledWith(
        'tx-1',
        expect.objectContaining({
          status: 'SUCCESS',
          stellarTxHash: 'stream-hash',
        }),
      );
      expect(events).toHaveLength(1);
      expect(events[0]?.status).toBe('SUCCESS');

      subscription.unsubscribe();
      expect(closeMock).toHaveBeenCalled();
    });

    it('does not update or emit anything for an event that matches no pending transaction', async () => {
      stellarAccountRepository.findByUserId.mockResolvedValue(buildAccount());
      transactionRepository.findPendingByStellarAccountId.mockResolvedValue([
        buildTransaction({
          id: 'tx-1',
          destinationPublicKey: 'GDEST',
          amount: '10.0000000',
        }),
      ]);
      streamAccountPaymentsMock.mockImplementation((params) => {
        setTimeout(() => {
          params.onEvent({
            type: 'payment',
            to: 'GDEST',
            amount: '999.0000000',
            assetType: 'native',
            transactionHash: 'unrelated-hash',
            createdAt: '2026-01-01T00:01:00.000Z',
          });
        }, 0);
        return { close: jest.fn() };
      });

      const events: TransactionRecord[] = [];
      const subscription = service
        .streamTransactionUpdates('user-1')
        .subscribe((t) => events.push(t));

      await flushMicrotasks();
      await new Promise((resolve) => setTimeout(resolve, 0));
      await flushMicrotasks();

      expect(transactionRepository.updateStatus).not.toHaveBeenCalled();
      expect(
        transactionRepository.findPendingByStellarAccountId,
      ).toHaveBeenCalledTimes(1);
      expect(events).toEqual([]);
      subscription.unsubscribe();
    });

    it('closes the underlying Horizon stream when the caller unsubscribes', async () => {
      stellarAccountRepository.findByUserId.mockResolvedValue(buildAccount());
      const closeMock = jest.fn();
      streamAccountPaymentsMock.mockReturnValue({ close: closeMock });

      const subscription = service
        .streamTransactionUpdates('user-1')
        .subscribe();
      await flushMicrotasks();

      subscription.unsubscribe();

      expect(closeMock).toHaveBeenCalled();
    });
  });

  describe('previewPath', () => {
    it('returns a strictSend quote', async () => {
      findStrictSendPathMock.mockResolvedValue({
        mode: 'strictSend',
        destAsset: { code: 'MMX', issuer: 'GISSUER' },
        sourceAmount: '10',
        destAmount: '19.8',
        path: [],
      });

      const result = await service.previewPath({
        source: {},
        dest: { assetCode: 'MMX', assetIssuer: 'GISSUER' },
        amount: '10',
        mode: 'strictSend',
      });

      expect(result).toEqual({
        mode: 'strictSend',
        sourceAmount: '10',
        destAmount: '19.8',
        path: [],
      });
    });

    it('throws PaymentFailedError with kind no_payment_path when no path exists', async () => {
      findStrictSendPathMock.mockResolvedValue(null);

      await expect(
        service.previewPath({
          source: {},
          dest: { assetCode: 'MMX', assetIssuer: 'GISSUER' },
          amount: '10',
          mode: 'strictSend',
        }),
      ).rejects.toMatchObject({ kind: 'no_payment_path' });
    });
  });

  describe('establishTrustlineForUser', () => {
    afterEach(() => {
      establishTrustlineMock.mockReset();
    });

    it('establishes a trustline and returns the asset details on success', async () => {
      stellarAccountRepository.findByUserId.mockResolvedValue(buildAccount());
      establishTrustlineMock.mockResolvedValue({
        hash: 'trust-hash',
        ledger: 1,
      });

      const result = await service.establishTrustlineForUser('user-1', {
        assetCode: 'USDC',
        assetIssuer: 'GISSUER',
      });

      expect(result).toEqual({
        stellarTxHash: 'trust-hash',
        assetCode: 'USDC',
        assetIssuer: 'GISSUER',
      });
      expect(establishTrustlineMock).toHaveBeenCalledWith(
        expect.objectContaining({
          asset: { code: 'USDC', issuer: 'GISSUER' },
        }),
      );
    });

    it('classifies and rethrows a Stellar failure as PaymentFailedError', async () => {
      stellarAccountRepository.findByUserId.mockResolvedValue(buildAccount());
      establishTrustlineMock.mockRejectedValue(
        new StellarPaymentError('issuer_not_found', 'issuer does not exist'),
      );

      await expect(
        service.establishTrustlineForUser('user-1', {
          assetCode: 'USDC',
          assetIssuer: 'GBADISSUER',
        }),
      ).rejects.toBeInstanceOf(PaymentFailedError);
    });
  });

  describe('getTransactionStatus', () => {
    it('returns a non-stale PENDING transaction as-is without reconciling', async () => {
      const fresh = buildTransaction({
        status: 'PENDING',
        createdAt: new Date(),
      });
      transactionRepository.findById.mockResolvedValue(fresh);
      stellarAccountRepository.findById.mockResolvedValue(buildAccount());

      const result = await service.getTransactionStatus('user-1', 'tx-1');

      expect(result).toBe(fresh);
    });

    it('throws NotFoundException for a transaction that does not exist', async () => {
      transactionRepository.findById.mockResolvedValue(null);

      await expect(
        service.getTransactionStatus('user-1', 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when the transaction belongs to another user', async () => {
      transactionRepository.findById.mockResolvedValue(buildTransaction());
      stellarAccountRepository.findById.mockResolvedValue(
        buildAccount({ userId: 'someone-else' }),
      );

      await expect(
        service.getTransactionStatus('user-1', 'tx-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('reconciliation', () => {
    function mockHorizonPayments(records: unknown[]) {
      const call = jest.fn().mockResolvedValue({ records });
      const limit = jest.fn().mockReturnValue({ call });
      const order = jest.fn().mockReturnValue({ limit });
      const forAccount = jest.fn().mockReturnValue({ order });
      stellarClient.horizon.payments = jest
        .fn()
        .mockReturnValue({ forAccount });
    }

    it('marks a stale transaction SUCCESS when a matching payment is found on-chain', async () => {
      const account = buildAccount();
      const transaction = buildTransaction({
        status: 'PENDING',
        createdAt: new Date(Date.now() - RECONCILIATION_STALE_MS - 1000),
        amount: '10.0000000',
        destinationPublicKey: 'GDEST',
      });
      transactionRepository.findById.mockResolvedValue(transaction);
      stellarAccountRepository.findById.mockResolvedValue(account);
      mockHorizonPayments([
        {
          type: 'payment',
          asset_type: 'native',
          to: 'GDEST',
          amount: '10.0000000',
          created_at: new Date(
            transaction.createdAt.getTime() + 1000,
          ).toISOString(),
          transaction_hash: 'found-hash',
        },
      ]);
      transactionRepository.updateStatus.mockImplementation(
        (_id: string, update: object) =>
          buildTransaction({ ...transaction, ...update }),
      );

      const result = await service.getTransactionStatus('user-1', 'tx-1');

      expect(result.status).toBe('SUCCESS');
      expect(result.stellarTxHash).toBe('found-hash');
    });

    it('leaves a stale transaction PENDING when unmatched but still within the escalation window', async () => {
      const account = buildAccount();
      const transaction = buildTransaction({
        status: 'PENDING',
        createdAt: new Date(Date.now() - RECONCILIATION_STALE_MS - 1000),
      });
      transactionRepository.findById.mockResolvedValue(transaction);
      stellarAccountRepository.findById.mockResolvedValue(account);
      mockHorizonPayments([]);

      const result = await service.getTransactionStatus('user-1', 'tx-1');

      expect(result.status).toBe('PENDING');
      expect(transactionRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('escalates to NEEDS_REVIEW once unmatched past the escalation window', async () => {
      const account = buildAccount();
      const transaction = buildTransaction({
        status: 'PENDING',
        createdAt: new Date(Date.now() - RECONCILIATION_ESCALATION_MS - 1000),
      });
      transactionRepository.findById.mockResolvedValue(transaction);
      stellarAccountRepository.findById.mockResolvedValue(account);
      mockHorizonPayments([]);
      transactionRepository.updateStatus.mockImplementation(
        (_id: string, update: object) =>
          buildTransaction({ ...transaction, ...update }),
      );

      const result = await service.getTransactionStatus('user-1', 'tx-1');

      expect(result.status).toBe('NEEDS_REVIEW');
      expect(transactionRepository.updateStatus).toHaveBeenCalledWith(
        'tx-1',
        expect.objectContaining({
          status: 'NEEDS_REVIEW',
          failureCode: 'reconciliation_escalated',
        }),
      );
    });

    it('leaves a transaction PENDING when Horizon is unreachable, rather than escalating early', async () => {
      const account = buildAccount();
      const transaction = buildTransaction({
        status: 'PENDING',
        createdAt: new Date(Date.now() - RECONCILIATION_STALE_MS - 1000),
      });
      transactionRepository.findById.mockResolvedValue(transaction);
      stellarAccountRepository.findById.mockResolvedValue(account);
      stellarClient.horizon.payments = jest.fn().mockImplementation(() => {
        throw new Error('ECONNREFUSED');
      });

      const result = await service.getTransactionStatus('user-1', 'tx-1');

      expect(result.status).toBe('PENDING');
    });

    it('matches a stale non-native asset transaction to its Horizon payment record', async () => {
      const account = buildAccount();
      const transaction = buildTransaction({
        status: 'PENDING',
        createdAt: new Date(Date.now() - RECONCILIATION_STALE_MS - 1000),
        amount: '10.0000000',
        destinationPublicKey: 'GDEST',
        assetCode: 'USDC',
        assetIssuer: 'GISSUER',
      });
      transactionRepository.findById.mockResolvedValue(transaction);
      stellarAccountRepository.findById.mockResolvedValue(account);
      mockHorizonPayments([
        {
          type: 'payment',
          asset_type: 'credit_alphanum4',
          asset_code: 'USDC',
          asset_issuer: 'GISSUER',
          to: 'GDEST',
          amount: '10.0000000',
          created_at: new Date(
            transaction.createdAt.getTime() + 1000,
          ).toISOString(),
          transaction_hash: 'found-hash',
        },
      ]);
      transactionRepository.updateStatus.mockImplementation(
        (_id: string, update: object) =>
          buildTransaction({ ...transaction, ...update }),
      );

      const result = await service.getTransactionStatus('user-1', 'tx-1');

      expect(result.status).toBe('SUCCESS');
      expect(result.stellarTxHash).toBe('found-hash');
    });

    it('does not match a native XLM payment record against a pending non-native asset transaction', async () => {
      const account = buildAccount();
      const transaction = buildTransaction({
        status: 'PENDING',
        createdAt: new Date(Date.now() - RECONCILIATION_STALE_MS - 1000),
        amount: '10.0000000',
        destinationPublicKey: 'GDEST',
        assetCode: 'USDC',
        assetIssuer: 'GISSUER',
      });
      transactionRepository.findById.mockResolvedValue(transaction);
      stellarAccountRepository.findById.mockResolvedValue(account);
      mockHorizonPayments([
        {
          type: 'payment',
          asset_type: 'native',
          to: 'GDEST',
          amount: '10.0000000',
          created_at: new Date(
            transaction.createdAt.getTime() + 1000,
          ).toISOString(),
          transaction_hash: 'wrong-asset-hash',
        },
      ]);

      const result = await service.getTransactionStatus('user-1', 'tx-1');

      expect(result.status).toBe('PENDING');
      expect(transactionRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('matches a stale path-payment transaction against the receive asset/destAmount, not the sent asset/amount', async () => {
      const account = buildAccount();
      const transaction = buildTransaction({
        status: 'PENDING',
        createdAt: new Date(Date.now() - RECONCILIATION_STALE_MS - 1000),
        amount: '10.0000000',
        destAmount: '19.8000000',
        destinationPublicKey: 'GDEST',
        assetCode: null,
        assetIssuer: null,
        receiveAssetCode: 'MMX',
        receiveAssetIssuer: 'GISSUER',
      });
      transactionRepository.findById.mockResolvedValue(transaction);
      stellarAccountRepository.findById.mockResolvedValue(account);
      mockHorizonPayments([
        {
          type: 'path_payment_strict_send',
          asset_type: 'credit_alphanum4',
          asset_code: 'MMX',
          asset_issuer: 'GISSUER',
          to: 'GDEST',
          amount: '19.8000000',
          created_at: new Date(
            transaction.createdAt.getTime() + 1000,
          ).toISOString(),
          transaction_hash: 'path-found-hash',
        },
      ]);
      transactionRepository.updateStatus.mockImplementation(
        (_id: string, update: object) =>
          buildTransaction({ ...transaction, ...update }),
      );

      const result = await service.getTransactionStatus('user-1', 'tx-1');

      expect(result.status).toBe('SUCCESS');
      expect(result.stellarTxHash).toBe('path-found-hash');
    });

    it('reconcilePendingTransactions processes every stale transaction returned by the repository', async () => {
      const stale = [
        buildTransaction({
          id: 'tx-a',
          createdAt: new Date(Date.now() - RECONCILIATION_STALE_MS - 1000),
        }),
        buildTransaction({
          id: 'tx-b',
          createdAt: new Date(Date.now() - RECONCILIATION_STALE_MS - 1000),
        }),
      ];
      transactionRepository.findStalePending.mockResolvedValue(stale);
      stellarAccountRepository.findById.mockResolvedValue(buildAccount());
      mockHorizonPayments([]);

      const result = await service.reconcilePendingTransactions();

      expect(result).toHaveLength(2);
      expect(transactionRepository.findStalePending).toHaveBeenCalledWith(
        expect.any(Date),
      );
    });
  });

  describe('listTransactionHistory', () => {
    it('returns an empty page when the caller has no Stellar account yet', async () => {
      stellarAccountRepository.findByUserId.mockResolvedValue(null);

      const result = await service.listTransactionHistory('user-1', 1, 20);

      expect(result).toEqual({ transactions: [], total: 0 });
    });
  });
});
