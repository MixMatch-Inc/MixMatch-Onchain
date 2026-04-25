import { server, serverKeypair } from '../config/stellar';
import { stellarLogger } from '../config/logger';
import { recordProviderCall } from '../config/observability';

export const ensureFunded = async () => {
  const publicKey = serverKeypair.publicKey();
  const network = process.env.STELLAR_NETWORK;

  if (network !== 'TESTNET') {
    stellarLogger.info('Skipping friendbot bootstrap outside testnet');
    return;
  }

  stellarLogger.info('Checking wallet balance', {
    publicKey: publicKey.slice(0, 8),
  });

  try {
    // 1. Try to load the account from the network
    const account = await recordProviderCall('stellar-horizon', 'load-account', () =>
      server.loadAccount(publicKey),
    );

    // 2. Account exists -> Check Balance
    const xlmBalance = account.balances.find((b) => b.asset_type === 'native');
    const currentBalance = Number(xlmBalance?.balance || 0);

    stellarLogger.info('Loaded current balance', {
      currentBalance,
    });

    if (currentBalance > 100) {
      stellarLogger.info('Wallet already sufficiently funded');
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
      stellarLogger.info('Account missing on ledger, calling friendbot');
      await callFriendbot(publicKey);
    } else {
      stellarLogger.error('Wallet balance check failed', {
        error,
      });
    }
  }
};

// Helper function to keep code clean
const callFriendbot = async (publicKey: string) => {
  stellarLogger.info('Calling friendbot');
  try {
    const response = await recordProviderCall('stellar-friendbot', 'fund-account', () =>
      fetch(`https://friendbot.stellar.org?addr=${publicKey}`),
    );
    const data = await response.json();

    if (response.ok) {
      stellarLogger.info('Friendbot funded account successfully');
    } else {
      stellarLogger.error('Friendbot funding failed', {
        data,
      });
    }
  } catch (err) {
    stellarLogger.error('Friendbot network call failed', {
      error: err,
    });
  }
};
