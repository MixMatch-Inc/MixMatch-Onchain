import { Horizon, Networks, Keypair } from '@stellar/stellar-sdk';
import dotenv from 'dotenv';

dotenv.config();

const isTestnet = process.env.STELLAR_NETWORK === 'TESTNET';

export const NETWORK_PASSPHRASE = isTestnet
  ? Networks.TESTNET
  : Networks.PUBLIC;

export const server = new Horizon.Server(
  process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org',
);

const secretKey = process.env.STELLAR_SEC_KEY;

if (!secretKey) {
  throw new Error('❌ FATAL: STELLAR_SEC_KEY is missing from .env');
}

export const serverKeypair = Keypair.fromSecret(secretKey);

export const getNetworkConfig = () => ({
  network: process.env.STELLAR_NETWORK,
  horizonUrl: process.env.STELLAR_HORIZON_URL,
  publicKey: serverKeypair.publicKey(),
});

export const PLATFORM_FEE = Number(process.env.PLATFORM_FEE_PERCENT || 0.1);
export const TREASURY_KEY =
  process.env.TREASURY_PUB_KEY || serverKeypair.publicKey();
