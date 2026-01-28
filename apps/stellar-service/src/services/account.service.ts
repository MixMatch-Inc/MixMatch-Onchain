import { server } from '../config/stellar';

export const checkAccount = async (publicKey: string) => {
  try {
    const account = await server.loadAccount(publicKey);

    const balances = account.balances.map((b) => ({
      asset: b.asset_type === 'native' ? 'XLM' : b.asset_code,
      balance: b.balance,
    }));

    return {
      exists: true,
      publicKey: account.id,
      balances,
    };
  } catch (error: any) {
    if (error.response?.status === 404 || error.name === 'NotFoundError') {
      return {
        exists: false,
        publicKey,
        balances: [],
      };
    }

    if (error.message?.includes('invalid')) {
      throw new Error('Invalid Stellar Public Key format');
    }
    throw error;
  }
};
