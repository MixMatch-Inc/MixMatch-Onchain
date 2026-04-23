import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import {
  checkStellarAccount,
  createStellarPayment,
  StellarGatewayError,
} from './stellar-gateway';

const paymentsRouter = Router();

paymentsRouter.get('/stellar/account/:publicKey', requireAuth, async (req, res) => {
  try {
    const result = await checkStellarAccount(req.params.publicKey);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof StellarGatewayError) {
      res.status(error.status).json({ message: error.message });
      return;
    }

    res.status(500).json({ message: 'Internal server error' });
  }
});

paymentsRouter.post('/stellar/payment', requireAuth, async (req, res) => {
  try {
    const result = await createStellarPayment(req.body);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof StellarGatewayError) {
      res.status(error.status).json({ message: error.message });
      return;
    }

    res.status(500).json({ message: 'Internal server error' });
  }
});

export default paymentsRouter;
