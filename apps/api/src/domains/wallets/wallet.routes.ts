import { Router } from 'express';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { validateRequest } from '../../middleware/validation';
import {
  createWalletLinkageSchema,
  verifyWalletLinkageSchema,
  updateWalletLinkageSchema,
  getWalletLinkagesQuerySchema,
  getWalletHistoryQuerySchema,
} from './wallet.validation';
import { requireAuth as authenticateToken } from '../../middleware/auth.middleware';

export function createWalletRoutes(): Router {
  const router = Router();
  const walletService = new WalletService();
  const walletController = new WalletController(walletService);

  // Apply authentication to all wallet routes
  router.use(authenticateToken);

  // POST /api/wallets/link - Link a new wallet
  router.post('/link', 
    validateRequest(createWalletLinkageSchema),
    walletController.linkWallet.bind(walletController)
  );

  // POST /api/wallets/:walletId/verify - Verify wallet ownership
  router.post('/:walletId/verify',
    validateRequest(verifyWalletLinkageSchema),
    walletController.verifyWallet.bind(walletController)
  );

  // PUT /api/wallets/:walletId - Update wallet linkage
  router.put('/:walletId',
    validateRequest(updateWalletLinkageSchema),
    walletController.updateWallet.bind(walletController)
  );

  // GET /api/wallets - Get user's wallet linkages
  router.get('/',
    validateRequest(getWalletLinkagesQuerySchema, 'query'),
    walletController.getUserWallets.bind(walletController)
  );

  // GET /api/wallets/:walletId - Get specific wallet linkage
  router.get('/:walletId',
    walletController.getWallet.bind(walletController)
  );

  // GET /api/wallets/:walletId/history - Get wallet linkage history
  router.get('/:walletId/history',
    validateRequest(getWalletHistoryQuerySchema, 'query'),
    walletController.getWalletHistory.bind(walletController)
  );

  // POST /api/wallets/:walletId/use - Record wallet usage
  router.post('/:walletId/use',
    walletController.recordWalletUsage.bind(walletController)
  );

  return router;
}
