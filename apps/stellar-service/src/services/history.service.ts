import { server, serverKeypair } from '../config/stellar';

let lastCursor = 'now'; 

export const pollHistory = async () => {
  const publicKey = serverKeypair.publicKey();
  console.log(`📡 Starting History Poller for ${publicKey.slice(0, 8)}...`);

  checkTransactions();
  setInterval(checkTransactions, 10000);
};

const checkTransactions = async () => {
  const publicKey = serverKeypair.publicKey();

  try {
    let call = server.transactions()
      .forAccount(publicKey)
      .cursor(lastCursor)
      .limit(10)
      .order('asc');

    const response = await call.call();

    if (response.records.length === 0) {
      return;
    }

    // 3. Process each new transaction
    for (const tx of response.records) {
      console.log(`🔔 NEW TRANSACTION DETECTED: ${tx.hash}`);
      console.log(`   Created at: ${tx.created_at}`);
      
      lastCursor = tx.paging_token;
    }
    
    console.log('✅ History Sync up to date.');

  } catch (error: any) {
    console.error('⚠️ History Polling Error:', error.message);
  }
};