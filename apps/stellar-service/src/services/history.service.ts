import { server, serverKeypair } from '../config/stellar';
import { stellarLogger } from '../config/logger';
import { recordProviderCall, stellarTelemetry } from '../config/observability';

let lastCursor = 'now'; 

export const pollHistory = async () => {
  const publicKey = serverKeypair.publicKey();
  stellarLogger.info('Starting history poller', {
    publicKey: publicKey.slice(0, 8),
  });
  stellarTelemetry.outboxBacklog.set({ service: 'stellar-service', queue: 'history-poller' }, 0);

  checkTransactions();
  setInterval(checkTransactions, 10000);
};

const checkTransactions = async () => {
  const publicKey = serverKeypair.publicKey();

  try {
    const call = server.transactions()
      .forAccount(publicKey)
      .cursor(lastCursor)
      .limit(10)
      .order('asc');

    const response = await recordProviderCall('stellar-horizon', 'transactions', () =>
      call.call(),
    );

    if (response.records.length === 0) {
      return;
    }

    // 3. Process each new transaction
    for (const tx of response.records) {
      stellarLogger.info('Detected new transaction', {
        hash: tx.hash,
        createdAt: tx.created_at,
      });
      
      lastCursor = tx.paging_token;
    }
    
    stellarLogger.info('History sync complete', {
      processed: response.records.length,
    });

  } catch (error: any) {
    stellarLogger.error('History polling failed', {
      error: error.message,
    });
  }
};
