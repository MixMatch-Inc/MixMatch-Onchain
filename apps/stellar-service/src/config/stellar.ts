import { Horizon, Networks, Keypair } from '@stellar/stellar-sdk';
import { stellarEnv } from './env';

const isTestnet = stellarEnv.network === 'TESTNET';

export const NETWORK_PASSPHRASE = isTestnet
  ? Networks.TESTNET
  : Networks.PUBLIC;

export const server = new Horizon.Server(
  stellarEnv.horizonUrl,
);

export const serverKeypair = Keypair.fromSecret(stellarEnv.secretKey);

export const getNetworkConfig = () => ({
  network: stellarEnv.network,
  horizonUrl: stellarEnv.horizonUrl,
  publicKey: serverKeypair.publicKey(),
});

export const PLATFORM_FEE = stellarEnv.platformFeePercent;
export const TREASURY_KEY =
  stellarEnv.treasuryPublicKey || serverKeypair.publicKey();
