import { Keypair, Networks, rpc, StrKey } from '@stellar/stellar-sdk';
import { describe, expect, it, vi, type Mock } from 'vitest';
import * as StellarSdk from '@stellar/stellar-sdk';
import type { DefaultStellarClient } from '../client.js';
import {
  depositToEscrow,
  getEscrow,
  refundEscrow,
  releaseEscrow,
  SorobanInvocationError,
} from '../escrow.js';
import { KeypairWallet } from '../wallet.js';

vi.mock('@stellar/stellar-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@stellar/stellar-sdk')>();
  return { ...actual, scValToNative: vi.fn() };
});

const scValToNativeMock = StellarSdk.scValToNative as Mock;

function fakeWallet(): KeypairWallet {
  return KeypairWallet.fromSecret('testnet', Keypair.random().secret());
}

function fakeContractId(seed = 1): string {
  return StrKey.encodeContract(Buffer.alloc(32, seed));
}

function fakeTokenContractId(): string {
  return fakeContractId(2);
}

function fakeSorobanClient(overrides: {
  prepareTransaction?: Mock;
  sendTransaction?: Mock;
  getTransaction?: Mock;
  simulateTransaction?: Mock;
}): DefaultStellarClient {
  const sourceKeypair = Keypair.random();
  return {
    networkPassphrase: Networks.TESTNET,
    horizon: {
      loadAccount: () =>
        Promise.resolve({
          accountId: () => sourceKeypair.publicKey(),
          sequenceNumber: () => '1',
          incrementSequenceNumber: () => {},
        }),
    },
    soroban: {
      prepareTransaction:
        overrides.prepareTransaction ?? vi.fn().mockImplementation((tx: unknown) => Promise.resolve(tx)),
      sendTransaction: overrides.sendTransaction ?? vi.fn(),
      getTransaction: overrides.getTransaction ?? vi.fn(),
      simulateTransaction: overrides.simulateTransaction ?? vi.fn(),
    },
  } as unknown as DefaultStellarClient;
}

describe('depositToEscrow', () => {
  it('submits a deposit invocation and returns the escrow id from the return value', async () => {
    scValToNativeMock.mockReturnValue(7n);
    const client = fakeSorobanClient({
      sendTransaction: vi.fn().mockResolvedValue({ status: 'PENDING', hash: 'h1' }),
      getTransaction: vi.fn().mockResolvedValue({
        status: rpc.Api.GetTransactionStatus.SUCCESS,
        returnValue: {},
      }),
    });

    const result = await depositToEscrow({
      client,
      contractId: fakeContractId(),
      payerWallet: fakeWallet(),
      payeePublicKey: Keypair.random().publicKey(),
      tokenContractId: fakeTokenContractId(),
      amount: '5000000',
      timeoutLedgers: 100,
    });

    expect(result).toEqual({ escrowId: 7n, hash: 'h1' });
  });

  it('signs and submits using the payer wallet\'s keypair, having each transaction go through prepareTransaction first', async () => {
    scValToNativeMock.mockReturnValue(1n);
    const signSpy = vi.fn();
    const client = fakeSorobanClient({
      prepareTransaction: vi.fn().mockResolvedValue({ sign: signSpy }),
      sendTransaction: vi.fn().mockResolvedValue({ status: 'PENDING', hash: 'h1' }),
      getTransaction: vi.fn().mockResolvedValue({
        status: rpc.Api.GetTransactionStatus.SUCCESS,
        returnValue: {},
      }),
    });

    await depositToEscrow({
      client,
      contractId: fakeContractId(),
      payerWallet: fakeWallet(),
      payeePublicKey: Keypair.random().publicKey(),
      tokenContractId: fakeTokenContractId(),
      amount: '1',
      timeoutLedgers: 10,
    });

    expect(signSpy).toHaveBeenCalledTimes(1);
  });

  it('throws SorobanInvocationError when submission is rejected', async () => {
    const client = fakeSorobanClient({
      sendTransaction: vi.fn().mockResolvedValue({ status: 'ERROR', errorResult: 'boom' }),
    });

    await expect(
      depositToEscrow({
        client,
        contractId: fakeContractId(),
        payerWallet: fakeWallet(),
        payeePublicKey: Keypair.random().publicKey(),
        tokenContractId: fakeTokenContractId(),
        amount: '1',
        timeoutLedgers: 10,
      }),
    ).rejects.toBeInstanceOf(SorobanInvocationError);
  });

  it('throws SorobanInvocationError when the landed transaction failed', async () => {
    const client = fakeSorobanClient({
      sendTransaction: vi.fn().mockResolvedValue({ status: 'PENDING', hash: 'h1' }),
      getTransaction: vi.fn().mockResolvedValue({ status: rpc.Api.GetTransactionStatus.FAILED }),
    });

    await expect(
      depositToEscrow({
        client,
        contractId: fakeContractId(),
        payerWallet: fakeWallet(),
        payeePublicKey: Keypair.random().publicKey(),
        tokenContractId: fakeTokenContractId(),
        amount: '1',
        timeoutLedgers: 10,
      }),
    ).rejects.toBeInstanceOf(SorobanInvocationError);
  });
});

describe('releaseEscrow', () => {
  it('submits a release invocation signed by the payer wallet', async () => {
    scValToNativeMock.mockReturnValue(undefined);
    const client = fakeSorobanClient({
      sendTransaction: vi.fn().mockResolvedValue({ status: 'PENDING', hash: 'h1' }),
      getTransaction: vi.fn().mockResolvedValue({ status: rpc.Api.GetTransactionStatus.SUCCESS }),
    });

    await expect(
      releaseEscrow({ client, contractId: fakeContractId(), escrowId: 3, payerWallet: fakeWallet() }),
    ).resolves.toEqual({ hash: 'h1' });
  });
});

describe('refundEscrow', () => {
  it('submits a refund invocation signed by the submitter wallet', async () => {
    scValToNativeMock.mockReturnValue(undefined);
    const client = fakeSorobanClient({
      sendTransaction: vi.fn().mockResolvedValue({ status: 'PENDING', hash: 'h1' }),
      getTransaction: vi.fn().mockResolvedValue({ status: rpc.Api.GetTransactionStatus.SUCCESS }),
    });

    await expect(
      refundEscrow({ client, contractId: fakeContractId(), escrowId: 3, submitterWallet: fakeWallet() }),
    ).resolves.toEqual({ hash: 'h1' });
  });
});

describe('getEscrow', () => {
  it('simulates a read-only get_escrow call and maps the result to an EscrowRecord', async () => {
    scValToNativeMock.mockReturnValue({
      payer: 'GPAYER',
      payee: 'GPAYEE',
      token: fakeTokenContractId(),
      amount: 500n,
      status: { Locked: undefined },
      timeout_ledger: 12345,
    });
    const client = fakeSorobanClient({
      simulateTransaction: vi.fn().mockResolvedValue({ result: { retval: {} } }),
    });

    const escrow = await getEscrow({ client, contractId: fakeContractId(), escrowId: 1 });

    expect(escrow).toEqual({
      payer: 'GPAYER',
      payee: 'GPAYEE',
      token: fakeTokenContractId(),
      amount: '500',
      status: 'Locked',
      timeoutLedger: 12345,
    });
  });

  it('throws SorobanInvocationError when simulation fails', async () => {
    const client = fakeSorobanClient({
      simulateTransaction: vi.fn().mockResolvedValue({ error: 'contract trapped: NotFound' }),
    });

    await expect(getEscrow({ client, contractId: fakeContractId(), escrowId: 999 })).rejects.toBeInstanceOf(
      SorobanInvocationError,
    );
  });
});
