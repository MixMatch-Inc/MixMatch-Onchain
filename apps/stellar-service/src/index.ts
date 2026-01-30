import express from "express";
import { Keypair, Operation } from "@stellar/stellar-sdk";
import { getNetworkConfig, serverKeypair } from "./config/stellar";
import { buildAndSubmitTx } from "./services/transaction.service";
import { ensureFunded } from "./services/friendbot";
import { sendPayment } from "./services/payment.service";
import { checkAccount } from "./services/account.service";
import { pollHistory } from "./services/history.service";
import { createEscrow } from './services/escrow.service';

const app = express();
const port = process.env.PORT || 3002;

app.get("/", (req: express.Request, res: express.Response) => {
  res.json({
    service: "MixMatch Stellar Service",
    status: "Active",
    config: getNetworkConfig(),
  });
});

app.post("/payment", async (req, res) => {
  try {
    const { destination, amount, memo } = req.body;

    if (!destination || !amount) {
      res.status(400).json({ error: "Missing destination or amount" });
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
      error: error.message || "Payment Failed",
    });
  }
});

app.get(
  "/account/:publicKey",
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
app.post('/escrow', async (req, res) => {
  try {
    const { destination, amount, unlockDate } = req.body;

    if (!destination || !amount || !unlockDate) {
      res.status(400).json({ error: 'Missing destination, amount, or unlockDate' });
      return;
    }

    const result = await createEscrow(destination, amount, unlockDate);
    
    res.json({
      success: true,
      hash: result.hash,
      message: `Escrow created! Funds locked until ${unlockDate}`
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Escrow Creation Failed' 
    });
  }
});
app.listen(port, async () => {
  console.log(`✨ Stellar Service running on port ${port}`);

  await ensureFunded();
});

app.post("/payment", async (req, res) => {
  try {
    const { destination, amount, memo } = req.body;
    if (!destination || !amount) {
      res.status(400).json({ error: "Missing destination or amount" });
      return;
    }
    const result = await sendPayment(destination, amount, memo);
    res.json({
      success: true,
      hash: result.hash,
      message: `Sent ${amount} XLM`,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(port, async () => {
  console.log(`✨ Stellar Service running on port ${port}`);
  console.log(`   Public Key: ${serverKeypair.publicKey()}`);

  await ensureFunded();

  pollHistory();
});
