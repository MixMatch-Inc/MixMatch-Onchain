import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  Keypair,
  nativeToScVal,
  rpc,
  scValToNative,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import type { DefaultStellarClient } from './client.js';
import type { Wallet } from './wallet.js';

const TRANSACTION_TIMEOUT_SECONDS = 30;
const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 30_000;

export type EscrowStatus = 'Locked' | 'Released' | 'Refunded';

export interface EscrowRecord {
  payer: string;
  payee: string;
  token: string;
  amount: string;
  status: EscrowStatus;
  timeoutLedger: number;
}

/** Thrown when a Soroban simulation or submitted transaction fails — wraps the RPC's own error/status detail. */
export class SorobanInvocationError extends Error {
  constructor(
    message: string,
    readonly detail: unknown,
  ) {
    super(message);
    this.name = 'SorobanInvocationError';
  }
}

export interface DepositEscrowParams {
  client: DefaultStellarClient;
  contractId: string;
  /** Signs and pays the deposit; becomes the escrow's `payer`. */
  payerWallet: Wallet;
  payeePublicKey: string;
  /** Contract id of the token being escrowed (a Stellar Asset Contract, or any SEP-41 token contract). */
  tokenContractId: string;
  /** Amount in the token's smallest unit (e.g. stroops for XLM), as a string or bigint. */
  amount: string | bigint;
  /** How many ledgers from now until the escrow becomes refundable by anyone. */
  timeoutLedgers: number;
}

export interface EscrowActionParams {
  client: DefaultStellarClient;
  contractId: string;
  escrowId: bigint | number;
}

export interface ReleaseEscrowParams extends EscrowActionParams {
  /** Must be the escrow's payer — the contract requires their authorization. */
  payerWallet: Wallet;
}

export interface RefundEscrowParams extends EscrowActionParams {
  /**
   * Submits (and pays the fee for) the refund transaction. Before the
   * escrow's timeout the contract also requires this to be the escrow's
   * payer, authorizing an explicit cancellation; from the timeout onward
   * the contract accepts the refund regardless of whose wallet submitted
   * it, since it no longer calls `payer.require_auth()`.
   */
  submitterWallet: Wallet;
}

function addressArg(publicKey: string): xdr.ScVal {
  return new Address(publicKey).toScVal();
}

function u64Arg(value: bigint | number): xdr.ScVal {
  return nativeToScVal(BigInt(value), { type: 'u64' });
}

interface InvocationResult {
  hash: string;
  returnValue: unknown;
}

async function submitInvocation(
  client: DefaultStellarClient,
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  signerWallet: Wallet,
): Promise<InvocationResult> {
  const contract = new Contract(contractId);
  const sourceAccount = await client.horizon.loadAccount(signerWallet.publicKey);

  const transaction = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: client.networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(TRANSACTION_TIMEOUT_SECONDS)
    .build();

  const prepared = await client.soroban.prepareTransaction(transaction);
  await signerWallet.sign(prepared);

  const sendResult = await client.soroban.sendTransaction(prepared);
  if (sendResult.status === 'ERROR') {
    throw new SorobanInvocationError(
      `Soroban submission for '${method}' was rejected`,
      sendResult.errorResult,
    );
  }

  const start = Date.now();
  let getResult = await client.soroban.getTransaction(sendResult.hash);
  while (getResult.status === rpc.Api.GetTransactionStatus.NOT_FOUND) {
    if (Date.now() - start > POLL_TIMEOUT_MS) {
      throw new SorobanInvocationError(
        `Timed out waiting for '${method}' transaction ${sendResult.hash} to land`,
        sendResult,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    getResult = await client.soroban.getTransaction(sendResult.hash);
  }

  if (getResult.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    throw new SorobanInvocationError(`Soroban '${method}' transaction failed`, getResult);
  }

  return {
    hash: sendResult.hash,
    returnValue: getResult.returnValue ? scValToNative(getResult.returnValue) : undefined,
  };
}

async function simulateReadOnly(
  client: DefaultStellarClient,
  contractId: string,
  method: string,
  args: xdr.ScVal[],
): Promise<unknown> {
  const contract = new Contract(contractId);
  // A throwaway account with sequence "0" is enough to simulate a read-only
  // call — the account never signs or pays for anything.
  const account = new Account(Keypair.random().publicKey(), '0');

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: client.networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(TRANSACTION_TIMEOUT_SECONDS)
    .build();

  const simulation = await client.soroban.simulateTransaction(transaction);
  if (rpc.Api.isSimulationError(simulation)) {
    throw new SorobanInvocationError(`Soroban '${method}' simulation failed`, simulation.error);
  }
  return simulation.result?.retval ? scValToNative(simulation.result.retval) : undefined;
}

function toEscrowRecord(raw: unknown): EscrowRecord {
  const value = raw as {
    payer: string;
    payee: string;
    token: string;
    amount: bigint;
    status: EscrowStatus | Record<EscrowStatus, unknown>;
    timeout_ledger: number;
  };
  const status = typeof value.status === 'string' ? value.status : (Object.keys(value.status)[0] as EscrowStatus);
  return {
    payer: value.payer,
    payee: value.payee,
    token: value.token,
    amount: value.amount.toString(),
    status,
    timeoutLedger: value.timeout_ledger,
  };
}

export interface DepositEscrowResult {
  escrowId: bigint;
  hash: string;
}

/** Locks `amount` of `tokenContractId` into the escrow contract, transferred from the payer's wallet. Returns the new escrow's id and the deposit transaction's hash. */
export async function depositToEscrow(params: DepositEscrowParams): Promise<DepositEscrowResult> {
  const result = await submitInvocation(
    params.client,
    params.contractId,
    'deposit',
    [
      addressArg(params.payerWallet.publicKey),
      addressArg(params.payeePublicKey),
      addressArg(params.tokenContractId),
      nativeToScVal(BigInt(params.amount), { type: 'i128' }),
      nativeToScVal(params.timeoutLedgers, { type: 'u32' }),
    ],
    params.payerWallet,
  );

  return { escrowId: result.returnValue as bigint, hash: result.hash };
}

/** Releases a locked escrow's funds to its payee. Requires the payer's authorization. Returns the release transaction's hash. */
export async function releaseEscrow(params: ReleaseEscrowParams): Promise<{ hash: string }> {
  const result = await submitInvocation(
    params.client,
    params.contractId,
    'release',
    [u64Arg(params.escrowId)],
    params.payerWallet,
  );
  return { hash: result.hash };
}

/** Returns a locked escrow's funds to its payer — see `RefundEscrowParams` for who may call this and when. Returns the refund transaction's hash. */
export async function refundEscrow(params: RefundEscrowParams): Promise<{ hash: string }> {
  const result = await submitInvocation(
    params.client,
    params.contractId,
    'refund',
    [u64Arg(params.escrowId)],
    params.submitterWallet,
  );
  return { hash: result.hash };
}

/** Reads an escrow's current on-chain state without submitting a transaction. */
export async function getEscrow(params: EscrowActionParams): Promise<EscrowRecord> {
  const result = await simulateReadOnly(params.client, params.contractId, 'get_escrow', [
    u64Arg(params.escrowId),
  ]);
  return toEscrowRecord(result);
}
