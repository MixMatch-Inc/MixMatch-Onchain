import { server, serverKeypair } from '../config/stellar';

export const ensureFunded = async () => {
  const publicKey = serverKeypair.publicKey();
  const network = process.env.STELLAR_NETWORK;

  if (network !== 'TESTNET') {
    console.log('ℹ️  Skipping Friendbot (Not on Testnet)');
    return;
  }

  console.log(`🔍 Checking wallet balance for ${publicKey.slice(0, 8)}...`);

  try {
    // 1. Try to load the account from the network
    const account = await server.loadAccount(publicKey);

    // 2. Account exists -> Check Balance
    const xlmBalance = account.balances.find((b) => b.asset_type === 'native');
    const currentBalance = Number(xlmBalance?.balance || 0);

    console.log(`💰 Current Balance: ${currentBalance} XLM`);

    if (currentBalance > 100) {
      console.log('✅ Wallet is sufficient.');
      return;
    }

    // 3. Exists but low balance -> Fund it
    await callFriendbot(publicKey);
  } catch (error: any) {
    // 4. Handle "Account Not Found" safely
    // We check multiple properties because the error format can vary
    const isNotFound =
      error.response?.status === 404 ||
      error.message?.includes('404') ||
      error.name === 'NotFoundError';

    if (isNotFound) {
      console.log('🆕 Account not found on ledger. Creating via Friendbot...');
      await callFriendbot(publicKey);
    } else {
      console.error('⚠️ Error checking wallet:', error);
    }
  }
};

// Helper function to keep code clean
const callFriendbot = async (publicKey: string) => {
  console.log('📉 Calling Friendbot...');
  try {
    const response = await fetch(
      `https://friendbot.stellar.org?addr=${publicKey}`,
    );
    const data = await response.json();

    if (response.ok) {
      console.log('🎉 Funded successfully by Friendbot!');
    } else {
      console.error('❌ Friendbot failed:', data);
    }
  } catch (err) {
    console.error('❌ Network error calling Friendbot:', err);
  }
};
