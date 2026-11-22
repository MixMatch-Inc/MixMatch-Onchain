'use client';

import type { BalancesResponse } from '@mixmatch/shared';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../lib/useAuth';
import { createWallet, fundWallet, getBalances, getWalletAccount } from '../../lib/wallet-setup-client';

export default function WalletPage() {
  const { accessToken } = useAuth();
  const [network, setNetwork] = useState<string>('testnet');
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [balances, setBalances] = useState<BalancesResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const wallet = await getWalletAccount(accessToken);
      setPublicKey(wallet.publicKey);
      setNetwork(wallet.network);
      setBalances(await getBalances(accessToken));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not load wallet.');
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    if (!accessToken) return;
    setBusy(true);
    try {
      await createWallet(accessToken);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not create wallet.');
    } finally {
      setBusy(false);
    }
  };

  const handleFund = async () => {
    if (!accessToken) return;
    setBusy(true);
    try {
      const result = await fundWallet(accessToken);
      setMessage(result.message);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not fund wallet.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page page--narrow" data-testid="wallet-screen">
      <div className="row row--between">
        <h1>Your wallet</h1>
        <span
          data-testid="network-badge"
          style={{ borderRadius: 999, background: network === 'public' ? '#dcfce7' : '#fef3c7', padding: '4px 10px', fontSize: 12, fontWeight: 600 }}
        >
          {network}
        </span>
      </div>
      {message ? <p className="error-text" role="alert">{message}</p> : null}
      {publicKey ? (
        <div className="card stack">
          <strong>Public address</strong>
          <code data-testid="wallet-address">{publicKey}</code>
        </div>
      ) : (
        <button type="button" className="btn btn--primary" onClick={() => void handleCreate()} disabled={busy} data-testid="create-wallet-button">
          Create wallet
        </button>
      )}
      {network === 'testnet' && publicKey ? (
        <button type="button" className="btn" onClick={() => void handleFund()} disabled={busy} data-testid="fund-wallet-button">
          Fund with Friendbot (testnet)
        </button>
      ) : null}
      <section className="stack">
        <h2>Balances</h2>
        {balances?.balances.map((item) => (
          <div className="row row--between" key={`${item.assetCode}:${item.assetIssuer ?? 'native'}`} data-testid={`balance-${item.assetCode}`}>
            <span>{item.assetCode}</span>
            <span>{item.balance}</span>
          </div>
        ))}
      </section>
      <Link href="/payments">Back to payments</Link>
    </main>
  );
}
