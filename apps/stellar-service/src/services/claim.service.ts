import {
  Keypair,
  TransactionBuilder,
  BASE_FEE,
  Operation,
} from '@stellar/stellar-sdk';
import { server, NETWORK_PASSPHRASE } from '../config/stellar';
import { stellarLogger } from '../config/logger';
import { recordProviderCall } from '../config/observability';

export const claimFunds = async (secretKey: string) => {
  const signerKeypair = Keypair.fromSecret(secretKey);
  const publicKey = signerKeypair.publicKey();

  stellarLogger.info('Checking claimable balances', {
    publicKey: publicKey.slice(0, 8),
  });

  const balances = await recordProviderCall('stellar-horizon', 'claimable-balances', () =>
    server.claimableBalances().claimant(publicKey).call(),
  );

  const record = balances.records[0];

  if (!record) {
    throw new Error('❌ No claimable balances found for this account.');
  }

  stellarLogger.info('Found claimable balance', {
    balanceId: record.id,
    amount: record.amount,
    asset: record.asset.split(':')[0],
  });

  const sourceAccount = await recordProviderCall('stellar-horizon', 'load-account', () =>
    server.loadAccount(publicKey),
  );

  const builder = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  builder.addOperation(
    Operation.claimClaimableBalance({
      balanceId: record.id,
    }),
  );

  builder.setTimeout(30);

  const transaction = builder.build();
  transaction.sign(signerKeypair);

  stellarLogger.info('Submitting claim transaction');
  const response = await recordProviderCall('stellar-horizon', 'submit-claim-transaction', () =>
    server.submitTransaction(transaction),
  );

  return {
    hash: response.hash,
    amount: record.amount,
    balanceId: record.id,
  };
};
