import express from 'express';
import { Keypair, Operation } from '@stellar/stellar-sdk';
import { getNetworkConfig, serverKeypair } from './config/stellar';
import { buildAndSubmitTx } from './services/transaction.service';

const app = express();
const port = process.env.PORT || 3002;

app.get('/', (req, res) => {
  res.json({
    service: 'MixMatch Stellar Service',
    status: 'Active',
    config: getNetworkConfig(),
  });
});

app.listen(port, async () => {
  console.log(`✨ Stellar Service running on port ${port}`);

  try {
    console.log('STARTING TEST: Creating a new account on-chain...');

    const fakeDjParams = Keypair.random();

    const createOp = Operation.createAccount({
      destination: fakeDjParams.publicKey(),
      startingBalance: '10',
    });

    await buildAndSubmitTx([createOp]);

    console.log('TEST PASSED: Transaction Builder works!');
  } catch (e) {
    console.error('Test Failed:', e);
  }
});
