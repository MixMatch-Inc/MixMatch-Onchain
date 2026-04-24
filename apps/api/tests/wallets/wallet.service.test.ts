import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { WalletService } from '../../src/domains/wallets/wallet.service';
import { WalletLinkage, WalletLinkageHistory } from '../../src/domains/wallets/wallet-linkage.model';
import { 
  StellarNetwork, 
  WalletLinkageStatus, 
  KeyProvenance, 
  FeatureEligibility,
  CreateWalletLinkageDto,
  UpdateWalletLinkageDto,
  VerifyWalletLinkageDto
} from '@mixmatch/types';

describe('WalletService', () => {
  let mongoServer: MongoMemoryServer;
  let walletService: WalletService;
  let testUserId: string;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    
    walletService = new WalletService();
    
    // Create a test user
    const testUser = new mongoose.Types.ObjectId();
    testUserId = testUser.toString();
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await WalletLinkage.deleteMany({});
    await WalletLinkageHistory.deleteMany({});
  });

  describe('createWalletLinkage', () => {
    it('should create a new wallet linkage successfully', async () => {
      const createDto: CreateWalletLinkageDto = {
        stellarAccountId: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJ',
        network: StellarNetwork.TESTNET,
        keyProvenance: KeyProvenance.USER_GENERATED,
        verificationSignature: 'test-signature',
      };

      const result = await walletService.createWalletLinkage(testUserId, createDto);

      assert.strictEqual(result.userId, testUserId);
      assert.strictEqual(result.stellarAccountId, createDto.stellarAccountId);
      assert.strictEqual(result.network, createDto.network);
      assert.strictEqual(result.keyProvenance, createDto.keyProvenance);
      assert.strictEqual(result.status, WalletLinkageStatus.ACTIVE);
      assert.deepStrictEqual(result.featureEligibility, [
        FeatureEligibility.MICRO_ACTIONS,
        FeatureEligibility.PAYMENTS,
        FeatureEligibility.GOVERNANCE,
      ]);
    });

    it('should create wallet linkage with pending verification status when no signature provided', async () => {
      const createDto: CreateWalletLinkageDto = {
        stellarAccountId: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJ',
        network: StellarNetwork.PUBLIC,
        keyProvenance: KeyProvenance.DERIVED_FROM_SEED,
      };

      const result = await walletService.createWalletLinkage(testUserId, createDto);

      assert.strictEqual(result.status, WalletLinkageStatus.PENDING_VERIFICATION);
      assert.strictEqual(result.verifiedAt, undefined);
      assert.deepStrictEqual(result.featureEligibility, [
        FeatureEligibility.MICRO_ACTIONS,
        FeatureEligibility.PAYMENTS,
      ]);
    });

    it('should throw error for duplicate wallet linkage', async () => {
      const createDto: CreateWalletLinkageDto = {
        stellarAccountId: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJ',
        network: StellarNetwork.TESTNET,
        keyProvenance: KeyProvenance.USER_GENERATED,
      };

      await walletService.createWalletLinkage(testUserId, createDto);

      try {
        await walletService.createWalletLinkage(testUserId, createDto);
        assert.fail('Should have thrown error for duplicate wallet');
      } catch (error) {
        assert.strictEqual(error.message, 'Wallet is already linked to this account');
      }
    });

    it('should throw error for invalid Stellar account ID', async () => {
      const createDto: CreateWalletLinkageDto = {
        stellarAccountId: 'invalid-account-id',
        network: StellarNetwork.TESTNET,
        keyProvenance: KeyProvenance.USER_GENERATED,
      };

      try {
        await walletService.createWalletLinkage(testUserId, createDto);
        assert.fail('Should have thrown error for invalid account ID');
      } catch (error) {
        assert.match(error.message, /Invalid Stellar account ID format/);
      }
    });

    it('should record history when creating wallet linkage', async () => {
      const createDto: CreateWalletLinkageDto = {
        stellarAccountId: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJ',
        network: StellarNetwork.TESTNET,
        keyProvenance: KeyProvenance.USER_GENERATED,
      };

      await walletService.createWalletLinkage(testUserId, createDto);

      const history = await WalletLinkageHistory.find({ userId: new mongoose.Types.ObjectId(testUserId) });
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].action, 'LINKED');
    });
  });

  describe('verifyWalletLinkage', () => {
    let walletLinkageId: string;

    beforeEach(async () => {
      const createDto: CreateWalletLinkageDto = {
        stellarAccountId: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJ',
        network: StellarNetwork.TESTNET,
        keyProvenance: KeyProvenance.USER_GENERATED,
      };

      const linkage = await walletService.createWalletLinkage(testUserId, createDto);
      walletLinkageId = linkage.id;
    });

    it('should verify wallet linkage successfully', async () => {
      const verifyDto: VerifyWalletLinkageDto = {
        verificationSignature: 'verification-signature',
      };

      const result = await walletService.verifyWalletLinkage(testUserId, walletLinkageId, verifyDto);

      assert.strictEqual(result.status, WalletLinkageStatus.ACTIVE);
      assert.strictEqual(result.verifiedAt instanceof Date, true);
    });

    it('should throw error for already verified wallet', async () => {
      const verifyDto: VerifyWalletLinkageDto = {
        verificationSignature: 'verification-signature',
      };

      await walletService.verifyWalletLinkage(testUserId, walletLinkageId, verifyDto);

      try {
        await walletService.verifyWalletLinkage(testUserId, walletLinkageId, verifyDto);
        assert.fail('Should have thrown error for already verified wallet');
      } catch (error) {
        assert.strictEqual(error.message, 'Wallet is already verified');
      }
    });

    it('should throw error for non-existent wallet linkage', async () => {
      const verifyDto: VerifyWalletLinkageDto = {
        verificationSignature: 'verification-signature',
      };

      try {
        await walletService.verifyWalletLinkage(testUserId, '507f1f77bcf86cd799439011', verifyDto);
        assert.fail('Should have thrown error for non-existent wallet');
      } catch (error) {
        assert.strictEqual(error.message, 'Wallet linkage not found');
      }
    });
  });

  describe('updateWalletLinkage', () => {
    let walletLinkageId: string;

    beforeEach(async () => {
      const createDto: CreateWalletLinkageDto = {
        stellarAccountId: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJ',
        network: StellarNetwork.TESTNET,
        keyProvenance: KeyProvenance.USER_GENERATED,
        verificationSignature: 'test-signature',
      };

      const linkage = await walletService.createWalletLinkage(testUserId, createDto);
      walletLinkageId = linkage.id;
    });

    it('should update wallet linkage status successfully', async () => {
      const updateDto: UpdateWalletLinkageDto = {
        status: WalletLinkageStatus.DISABLED,
        metadata: { disconnectReason: 'User requested' },
      };

      const result = await walletService.updateWalletLinkage(testUserId, walletLinkageId, updateDto);

      assert.strictEqual(result.status, WalletLinkageStatus.DISABLED);
      assert.strictEqual(result.disconnectReason, 'User requested');
    });

    it('should update wallet linkage feature eligibility', async () => {
      const updateDto: UpdateWalletLinkageDto = {
        featureEligibility: [FeatureEligibility.MICRO_ACTIONS],
      };

      const result = await walletService.updateWalletLinkage(testUserId, walletLinkageId, updateDto);

      assert.deepStrictEqual(result.featureEligibility, [FeatureEligibility.MICRO_ACTIONS]);
    });

    it('should handle wallet disconnection properly', async () => {
      const updateDto: UpdateWalletLinkageDto = {
        status: WalletLinkageStatus.DISCONNECTED,
        metadata: { disconnectReason: 'User requested disconnection' },
      };

      const result = await walletService.updateWalletLinkage(testUserId, walletLinkageId, updateDto);

      assert.strictEqual(result.status, WalletLinkageStatus.DISCONNECTED);
      assert.strictEqual(result.disconnectReason, 'User requested disconnection');
      assert.strictEqual(result.disconnectedAt instanceof Date, true);
    });
  });

  describe('getUserWalletLinkages', () => {
    beforeEach(async () => {
      // Create multiple wallet linkages
      const wallets = [
        {
          stellarAccountId: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJ',
          network: StellarNetwork.TESTNET,
          keyProvenance: KeyProvenance.USER_GENERATED,
          verificationSignature: 'signature1',
        },
        {
          stellarAccountId: 'GBCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDE',
          network: StellarNetwork.PUBLIC,
          keyProvenance: KeyProvenance.HARDWARE_WALLET,
          verificationSignature: 'signature2',
        },
        {
          stellarAccountId: 'GCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEF',
          network: StellarNetwork.TESTNET,
          keyProvenance: KeyProvenance.EXCHANGE_WALLET,
        },
      ];

      for (const wallet of wallets) {
        await walletService.createWalletLinkage(testUserId, wallet);
      }
    });

    it('should return all wallet linkages for user', async () => {
      const result = await walletService.getUserWalletLinkages(testUserId);

      assert.strictEqual(result.length, 3);
    });

    it('should filter wallet linkages by status', async () => {
      const result = await walletService.getUserWalletLinkages(testUserId, WalletLinkageStatus.ACTIVE);

      assert.strictEqual(result.length, 2);
      result.forEach(wallet => {
        assert.strictEqual(wallet.status, WalletLinkageStatus.ACTIVE);
      });
    });

    it('should filter wallet linkages by network', async () => {
      const result = await walletService.getUserWalletLinkages(testUserId, undefined, StellarNetwork.TESTNET);

      assert.strictEqual(result.length, 2);
      result.forEach(wallet => {
        assert.strictEqual(wallet.network, StellarNetwork.TESTNET);
      });
    });

    it('should filter wallet linkages by both status and network', async () => {
      const result = await walletService.getUserWalletLinkages(
        testUserId, 
        WalletLinkageStatus.ACTIVE, 
        StellarNetwork.TESTNET
      );

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].status, WalletLinkageStatus.ACTIVE);
      assert.strictEqual(result[0].network, StellarNetwork.TESTNET);
    });
  });

  describe('updateLastUsed', () => {
    let walletLinkageId: string;

    beforeEach(async () => {
      const createDto: CreateWalletLinkageDto = {
        stellarAccountId: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJ',
        network: StellarNetwork.TESTNET,
        keyProvenance: KeyProvenance.USER_GENERATED,
        verificationSignature: 'test-signature',
      };

      const linkage = await walletService.createWalletLinkage(testUserId, createDto);
      walletLinkageId = linkage.id;
    });

    it('should update last used timestamp', async () => {
      const beforeUpdate = new Date();
      
      await walletService.updateLastUsed(walletLinkageId);
      
      const wallet = await WalletLinkage.findById(walletLinkageId);
      assert.strictEqual(wallet!.lastUsedAt! > beforeUpdate, true);
    });
  });

  describe('getWalletLinkageHistory', () => {
    let walletLinkageId: string;

    beforeEach(async () => {
      const createDto: CreateWalletLinkageDto = {
        stellarAccountId: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJ',
        network: StellarNetwork.TESTNET,
        keyProvenance: KeyProvenance.USER_GENERATED,
      };

      const linkage = await walletService.createWalletLinkage(testUserId, createDto);
      walletLinkageId = linkage.id;

      // Add some history entries
      await walletService.verifyWalletLinkage(testUserId, walletLinkageId, {
        verificationSignature: 'test-signature',
      });

      await walletService.updateWalletLinkage(testUserId, walletLinkageId, {
        status: WalletLinkageStatus.DISABLED,
      });
    });

    it('should return wallet linkage history', async () => {
      const history = await walletService.getWalletLinkageHistory(testUserId, walletLinkageId);

      assert.strictEqual(history.length, 2);
      assert.strictEqual(history[0].action, 'DISABLED');
      assert.strictEqual(history[1].action, 'VERIFIED');
    });

    it('should limit history results', async () => {
      const history = await walletService.getWalletLinkageHistory(testUserId, walletLinkageId, 1);

      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].action, 'DISABLED');
    });
  });
});
