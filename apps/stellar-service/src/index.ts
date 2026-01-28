import express from 'express';
import { Keypair, Operation } from '@stellar/stellar-sdk';
import { getNetworkConfig, serverKeypair } from './config/stellar';
import { buildAndSubmitTx } from './services/transaction.service';
import { ensureFunded } from './services/friendbot';
import { checkAccount } from './services/account.service';

const app = express();
const port = process.env.PORT || 3002;

app.get('/', (req: express.Request, res: express.Response) => {
  res.json({
    service: 'MixMatch Stellar Service',
    status: 'Active',
    config: getNetworkConfig(),
  });
});

app.get(
  '/account/:publicKey',
  async (req: express.Request, res: express.Response) => {
    try {
      const { publicKey } = req.params;
      const result = await checkAccount(publicKey);

      if (!result.exists) {
        res.status(404).json(result);
        return;
      }

      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
);

app.listen(port, async () => {
  console.log(`✨ Stellar Service running on port ${port}`);

  await ensureFunded();
});
