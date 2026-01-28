import express from 'express';
import { Keypair, Operation } from '@stellar/stellar-sdk';
import { getNetworkConfig, serverKeypair } from './config/stellar';
import { buildAndSubmitTx } from './services/transaction.service';
import { ensureFunded } from './services/friendbot';
import { sendPayment } from './services/payment.service';

const app = express();
const port = process.env.PORT || 3002;

app.get('/', (req, res) => {
  res.json({
    service: 'MixMatch Stellar Service',
    status: 'Active',
    config: getNetworkConfig(),
  });
});

app.post('/payment', async (req, res) => {
  try {
    const { destination, amount, memo } = req.body;

    if (!destination || !amount) {
      res.status(400).json({ error: 'Missing destination or amount' });
      return;
    }

    const result = await sendPayment(destination, amount, memo);

    res.json({
      success: true,
      hash: result.hash,
      message: `Sent ${amount} XLM to ${destination}`,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: error.message || 'Payment Failed',
    });
  }
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
  console.log(`   Public Key: ${serverKeypair.publicKey()}`);

  await ensureFunded();
});
