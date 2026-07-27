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
import { StellarPaymentService } from './payment.js';
import { StellarPaymentError } from './payment-errors.js';

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

  it(
    'submits a real native payment between two funded testnet accounts',
    async () => {
      const config = loadStellarConfig({ STELLAR_NETWORK: 'testnet' });
      const client = createStellarClient(config);
      const payments = new StellarPaymentService(client);

      const sender = generateStellarAccount('testnet');
      const receiver = generateStellarAccount('testnet');

      await fundTestnetAccount(client.horizon, 'testnet', sender.publicKey);
      await fundTestnetAccount(client.horizon, 'testnet', receiver.publicKey);

      const result = await payments.submitNativePayment({
        sourceWallet: sender.wallet,
        destinationPublicKey: receiver.publicKey,
        amount: '5',
        idempotencyKey: `integration-test-${sender.publicKey}`,
      });

      expect(result.successful).toBe(true);
      expect(result.hash).toMatch(/^[0-9a-f]{64}$/);

      const receiverAccount = await loadStellarAccount(client.horizon, 'testnet', receiver.publicKey);
      const nativeBalance = receiverAccount.balances.find((b) => b.asset_type === 'native');
      // Friendbot funds with 10,000 XLM; we sent 5 more.
      expect(Number(nativeBalance?.balance)).toBeGreaterThan(10_000);
    },
    30_000,
  );

  it(
    'rejects a payment to a nonexistent destination with destination_not_found',
    async () => {
      const config = loadStellarConfig({ STELLAR_NETWORK: 'testnet' });
      const client = createStellarClient(config);
      const payments = new StellarPaymentService(client);

      const sender = generateStellarAccount('testnet');
      const nonexistentDestination = generateStellarAccount('testnet');

      await fundTestnetAccount(client.horizon, 'testnet', sender.publicKey);

      await expect(
        payments.submitNativePayment({
          sourceWallet: sender.wallet,
          destinationPublicKey: nonexistentDestination.publicKey,
          amount: '5',
        }),
      ).rejects.toMatchObject({
        kind: 'destination_not_found',
      } satisfies Partial<StellarPaymentError>);
    },
    30_000,
  );

  it(
    'does not submit a second payment for a repeated idempotency key',
    async () => {
      const config = loadStellarConfig({ STELLAR_NETWORK: 'testnet' });
      const client = createStellarClient(config);
      const payments = new StellarPaymentService(client);

      const sender = generateStellarAccount('testnet');
      const receiver = generateStellarAccount('testnet');

      await fundTestnetAccount(client.horizon, 'testnet', sender.publicKey);
      await fundTestnetAccount(client.horizon, 'testnet', receiver.publicKey);

      const idempotencyKey = `integration-dup-test-${sender.publicKey}`;
      const params = {
        sourceWallet: sender.wallet,
        destinationPublicKey: receiver.publicKey,
        amount: '1',
        idempotencyKey,
      };

      const [first, second] = await Promise.all([
        payments.submitNativePayment(params),
        payments.submitNativePayment(params),
      ]);

      // Same underlying submission — not two separate on-chain payments.
      expect(second.hash).toBe(first.hash);
    },
    30_000,
  );
});
