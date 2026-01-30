import {
  Keypair,
  TransactionBuilder,
  BASE_FEE,
  Operation,
  TimeoutInfinite,
} from '@stellar/stellar-sdk';
import { server, NETWORK_PASSPHRASE } from '../config/stellar';

export const claimFunds = async (secretKey: string) => {
  const signerKeypair = Keypair.fromSecret(secretKey);
  const publicKey = signerKeypair.publicKey();

  console.log(
    `🕵️‍♀️ Looking for claimable balances for: ${publicKey.slice(0, 8)}...`,
  );

  const balances = await server.claimableBalances().claimant(publicKey).call();

  const record = balances.records[0];

  if (!record) {
    throw new Error('❌ No claimable balances found for this account.');
  }

  console.log(`   Found Balance ID: ${record.id}`);
  console.log(`   Amount: ${record.amount} ${record.asset.split(':')[0]}`);

  const sourceAccount = await server.loadAccount(publicKey);

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

  console.log('🚀 Submitting Claim Transaction...');
  const response = await server.submitTransaction(transaction);

  return {
    hash: response.hash,
    amount: record.amount,
    balanceId: record.id,
  };
};
