import {
  TransactionBuilder,
  BASE_FEE,
  Operation,
  TimeoutInfinite,
} from '@stellar/stellar-sdk';
import { server, serverKeypair, NETWORK_PASSPHRASE } from '../config/stellar';

export const buildAndSubmitTx = async (
  operations: Array<ReturnType<typeof Operation.payment>>,
  memoText?: string,
) => {
  try {
    console.log('Building Transaction...');

    const sourceAccount = await server.loadAccount(serverKeypair.publicKey());

    let builder = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    });

    operations.forEach((op) => builder.addOperation(op));

    builder.setTimeout(30);

    const transaction = builder.build();

    transaction.sign(serverKeypair);

    console.log('Submitting to Stellar Network...');
    const response = await server.submitTransaction(transaction);

    console.log(`Transaction Successful! Hash: ${response.hash}`);
    return response;
  } catch (error: any) {
    console.error(
      'Transaction Failed:',
      error.response?.data?.extras?.result_codes || error.message,
    );
    throw error;
  }
};
