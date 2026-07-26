import { Keypair, TransactionBuilder, Operation, Asset, Memo } from '@stellar/stellar-sdk';
import type { DefaultStellarClient } from './client.js';

export interface PaymentResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export interface PaymentHistoryEntry {
  hash: string;
  amount: string;
  asset: string;
  from: string;
  to: string;
  timestamp: Date;
  memo?: string;
}

export class StellarPaymentService {
  private client: DefaultStellarClient;

  constructor(client: DefaultStellarClient) {
    this.client = client;
  }

  async sendPayment(fromSecret: string, toAddress: string, amount: string, memo?: string): Promise<PaymentResult> {
    try {
      const keypair = Keypair.fromSecret(fromSecret);
      const fromAddress = keypair.publicKey();

      const sourceAccount = await this.client.horizon.loadAccount(fromAddress);

      const baseFee = await this.client.horizon.fetchBaseFee();

      const transactionBuilder = new TransactionBuilder(sourceAccount, {
        fee: String(baseFee),
        networkPassphrase: this.client.config.networkPassphrase,
      });

      const paymentOp = Operation.payment({
        destination: toAddress,
        asset: Asset.native(),
        amount,
      });

      let tx = transactionBuilder.addOperation(paymentOp);

      if (memo) {
        tx = tx.addMemo(Memo.text(memo));
      }

      const builtTransaction = tx.setTimeout(180).build();
      builtTransaction.sign(keypair);

      const result = await this.client.horizon.submitTransaction(builtTransaction);

      return {
        success: true,
        transactionHash: result.hash,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: message,
      };
    }
  }

  async getPaymentHistory(address: string, limit: number = 10): Promise<PaymentHistoryEntry[]> {
    try {
      const paymentsResponse = await this.client.horizon
        .payments()
        .forAccount(address)
        .limit(limit)
        .order('desc')
        .call();

      const entries: PaymentHistoryEntry[] = [];

      for (const record of paymentsResponse.records) {
        if (!isPaymentLikeRecord(record as Partial<PaymentLikeRecord>)) {
          continue;
        }

        const paymentRecord = record as unknown as PaymentLikeRecord;

        let memo: string | undefined;
        try {
          const txResponse = await this.client.horizon
            .transactions()
            .transaction(paymentRecord.transaction_hash)
            .call();
          if ('memo' in txResponse && typeof txResponse.memo === 'string') {
            memo = txResponse.memo;
          }
        } catch {
          // Transaction may not be available yet; skip memo
        }

        entries.push({
          hash: paymentRecord.transaction_hash,
          amount: paymentRecord.amount,
          asset: paymentRecord.asset_type === 'native' ? 'XLM' : `${paymentRecord.asset_code ?? 'unknown'}`,
          from: paymentRecord.from,
          to: paymentRecord.to,
          timestamp: new Date(paymentRecord.created_at),
          memo,
        });
      }

      return entries;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch payment history: ${message}`);
    }
  }

  async getPaymentStatus(transactionHash: string): Promise<'pending' | 'success' | 'failed'> {
    try {
      const response = await this.client.horizon
        .transactions()
        .transaction(transactionHash)
        .call();

      if (response.successful) {
        return 'success';
      }
      return 'failed';
    } catch (error) {
      if (isNotFoundError(error)) {
        return 'pending';
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch payment status: ${message}`);
    }
  }
}

interface PaymentLikeRecord {
  type: string;
  transaction_hash: string;
  amount: string;
  asset_type: string;
  asset_code?: string;
  from: string;
  to: string;
  created_at: string;
}

function isPaymentLikeRecord(record: {
  transaction_hash?: unknown;
  amount?: unknown;
  from?: unknown;
  to?: unknown;
}): record is PaymentLikeRecord {
  return (
    typeof record.transaction_hash === 'string' &&
    typeof record.amount === 'string' &&
    typeof record.from === 'string' &&
    typeof record.to === 'string'
  );
}

function isNotFoundError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { status?: number } }).response;
    return response?.status === 404;
  }
  return false;
}
