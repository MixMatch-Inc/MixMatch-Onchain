import {
  TransactionBuilder,
  BASE_FEE,
  Operation,
  Memo,
} from '@stellar/stellar-sdk';
import { server, serverKeypair, NETWORK_PASSPHRASE } from '../config/stellar';
import { stellarLogger } from '../config/logger';
import { recordProviderCall } from '../config/observability';

export const buildAndSubmitTx = async (
  operations: Array<ReturnType<typeof Operation.payment>>,
  memoText?: string,
) => {
  try {
    stellarLogger.info('Building transaction');

    const sourceAccount = await recordProviderCall('stellar-horizon', 'load-source-account', () =>
      server.loadAccount(serverKeypair.publicKey()),
    );

    let builder = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    });

    operations.forEach((op) => builder.addOperation(op));

    if (memoText && memoText.trim().length > 0) {
      builder.addMemo(Memo.text(memoText.trim().slice(0, 28)));
    }

    builder.setTimeout(30);

    const transaction = builder.build();

    transaction.sign(serverKeypair);

    stellarLogger.info('Submitting transaction to Stellar network');
    const response = await recordProviderCall('stellar-horizon', 'submit-transaction', () =>
      server.submitTransaction(transaction),
    );

    stellarLogger.info('Transaction submitted successfully', {
      hash: response.hash,
    });
    return response;
  } catch (error: any) {
    stellarLogger.error('Transaction submission failed', {
      error:
        error.response?.data?.extras?.result_codes || error.message || error,
    });
    throw error;
  }
};
