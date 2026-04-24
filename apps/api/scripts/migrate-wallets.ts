import mongoose from 'mongoose';
import { WalletLinkage, WalletLinkageHistory } from '../src/domains/wallets/wallet-linkage.model';

async function migrateWallets() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mixmatch';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Create collections with indexes
    console.log('Creating wallet_linkages collection...');
    await WalletLinkage.createCollection();
    
    console.log('Creating wallet_linkage_history collection...');
    await WalletLinkageHistory.createCollection();

    console.log('Wallet migration completed successfully');
  } catch (error) {
    console.error('Wallet migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateWallets()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { migrateWallets };
