import express from 'express';
import { getNetworkConfig, serverKeypair } from './config/stellar';
import { ensureFunded } from './services/friendbot';

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
  console.log(`   Public Key: ${serverKeypair.publicKey()}`);

  await ensureFunded();
});
