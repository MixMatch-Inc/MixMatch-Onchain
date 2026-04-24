import { Request, Response } from 'express';
import { WalletService } from './wallet.service';
import { 
  CreateWalletLinkageDto,
  UpdateWalletLinkageDto,
  VerifyWalletLinkageDto,
  WalletLinkageStatus,
  StellarNetwork
} from '@mixmatch/types';

export class WalletController {
  constructor(private walletService: WalletService) {}

  /**
   * POST /api/wallets/link
   * Link a new Stellar wallet to the user account
   */
  async linkWallet(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const createDto: CreateWalletLinkageDto = req.body;
      
      // Validate Stellar account ID format
      if (!/^G[A-Z0-9]{55}$/.test(createDto.stellarAccountId)) {
        return res.status(400).json({ error: 'Invalid Stellar account ID format' });
      }

      const context = {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      };

      const walletLinkage = await this.walletService.createWalletLinkage(
        userId,
        createDto,
        context
      );

      res.status(201).json({
        success: true,
        data: walletLinkage,
      });
    } catch (error) {
      console.error('Error linking wallet:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to link wallet',
      });
    }
  }

  /**
   * POST /api/wallets/:walletId/verify
   * Verify a wallet linkage
   */
  async verifyWallet(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { walletId } = req.params;
      const verifyDto: VerifyWalletLinkageDto = req.body;

      const context = {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      };

      const walletLinkage = await this.walletService.verifyWalletLinkage(
        userId,
        walletId,
        verifyDto,
        context
      );

      res.json({
        success: true,
        data: walletLinkage,
      });
    } catch (error) {
      console.error('Error verifying wallet:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify wallet',
      });
    }
  }

  /**
   * PUT /api/wallets/:walletId
   * Update wallet linkage
   */
  async updateWallet(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { walletId } = req.params;
      const updateDto: UpdateWalletLinkageDto = req.body;

      const context = {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      };

      const walletLinkage = await this.walletService.updateWalletLinkage(
        userId,
        walletId,
        updateDto,
        context
      );

      res.json({
        success: true,
        data: walletLinkage,
      });
    } catch (error) {
      console.error('Error updating wallet:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update wallet',
      });
    }
  }

  /**
   * GET /api/wallets
   * Get all wallet linkages for the user
   */
  async getUserWallets(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { status, network } = req.query;

      const wallets = await this.walletService.getUserWalletLinkages(
        userId,
        status as WalletLinkageStatus,
        network as StellarNetwork
      );

      res.json({
        success: true,
        data: wallets,
      });
    } catch (error) {
      console.error('Error fetching wallets:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch wallets',
      });
    }
  }

  /**
   * GET /api/wallets/:walletId
   * Get a specific wallet linkage
   */
  async getWallet(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { walletId } = req.params;

      const wallet = await this.walletService.getWalletLinkageById(userId, walletId);

      if (!wallet) {
        return res.status(404).json({
          success: false,
          error: 'Wallet linkage not found',
        });
      }

      res.json({
        success: true,
        data: wallet,
      });
    } catch (error) {
      console.error('Error fetching wallet:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch wallet',
      });
    }
  }

  /**
   * GET /api/wallets/:walletId/history
   * Get wallet linkage history
   */
  async getWalletHistory(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { walletId } = req.params;
      const { limit = 50 } = req.query;

      const history = await this.walletService.getWalletLinkageHistory(
        userId,
        walletId,
        Number(limit)
      );

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      console.error('Error fetching wallet history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch wallet history',
      });
    }
  }

  /**
   * POST /api/wallets/:walletId/use
   * Record wallet usage (for micro-actions)
   */
  async recordWalletUsage(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { walletId } = req.params;

      // Verify wallet belongs to user and is active
      const wallet = await this.walletService.getWalletLinkageById(userId, walletId);
      
      if (!wallet) {
        return res.status(404).json({
          success: false,
          error: 'Wallet linkage not found',
        });
      }

      if (wallet.status !== WalletLinkageStatus.ACTIVE) {
        return res.status(400).json({
          success: false,
          error: 'Wallet is not active',
        });
      }

      await this.walletService.updateLastUsed(walletId);

      res.json({
        success: true,
        message: 'Wallet usage recorded',
      });
    } catch (error) {
      console.error('Error recording wallet usage:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to record wallet usage',
      });
    }
  }
}
