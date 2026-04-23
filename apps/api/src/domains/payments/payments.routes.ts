import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import {
  checkStellarAccount,
  createStellarPayment,
  StellarGatewayError,
} from './stellar-gateway';
import { getPropagationHeaders } from '../../utils/context';

const paymentsRouter = Router();

paymentsRouter.get('/stellar/account/:publicKey', requireAuth, async (req, res) => {
  try {
    const headers = getPropagationHeaders(req.context);
    const result = await checkStellarAccount(req.params.publicKey, headers);
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
    const headers = getPropagationHeaders(req.context);
    const result = await createStellarPayment(req.body, headers);
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
