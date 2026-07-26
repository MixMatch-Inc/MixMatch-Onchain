/**
 * Integration tests against real Stellar testnet infrastructure (Friendbot +
 * Horizon). These make live network calls, so they're skipped by default and
 * only run when explicitly opted into — e.g. locally or in a dedicated CI
 * job — via `RUN_STELLAR_INTEGRATION_TESTS=true pnpm --filter @mixmatch/stellar test`.
 *
 * This keeps the default `pnpm test` (used by `.github/workflows/shared.yml`
 * on every PR) fast and independent of testnet availability.
 */
import { describe, expect, it } from 'vitest';
import { loadStellarConfig } from './config.js';
import { createStellarClient } from './client.js';
import { generateStellarAccount, loadStellarAccount, StellarAccountNotFoundError } from './account.js';
import { fundTestnetAccount } from './friendbot.js';

const runIntegrationTests = process.env.RUN_STELLAR_INTEGRATION_TESTS === 'true';

describe.skipIf(!runIntegrationTests)('Stellar testnet integration', () => {
  it(
    'generates an account, confirms it is unfunded, funds it via Friendbot, then loads its balance',
    async () => {
      const config = loadStellarConfig({ STELLAR_NETWORK: 'testnet' });
      const client = createStellarClient(config);
      const account = generateStellarAccount('testnet');

      await expect(
        loadStellarAccount(client.horizon, 'testnet', account.publicKey),
      ).rejects.toThrow(StellarAccountNotFoundError);

      await fundTestnetAccount(client.horizon, 'testnet', account.publicKey);

      const funded = await loadStellarAccount(client.horizon, 'testnet', account.publicKey);

      expect(funded.publicKey).toBe(account.publicKey);
      const nativeBalance = funded.balances.find((b) => b.asset_type === 'native');
      expect(nativeBalance).toBeDefined();
      expect(Number(nativeBalance?.balance)).toBeGreaterThan(0);
    },
    30_000,
  );
});
