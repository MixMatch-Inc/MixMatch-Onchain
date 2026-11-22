'use client';

import type { CreatorDetailResponse } from '@mixmatch/shared';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCreator, resolveTip } from '../../../lib/profile-client';
import { useAuth } from '../../../lib/useAuth';

/** Public artist page with a tipping action (#1378, #1379). */
export default function CreatorPage() {
  const params = useParams<{ handle: string }>();
  const handle = params?.handle ?? '';
  const router = useRouter();
  const { accessToken, isLoading } = useAuth();
  const [detail, setDetail] = useState<CreatorDetailResponse | null>(null);
  const [error, setError] = useState(false);
  const [tipError, setTipError] = useState<string | null>(null);
  const [tipping, setTipping] = useState(false);

  useEffect(() => {
    if (!handle) return;
    getCreator(handle)
      .then(setDetail)
      .catch(() => setError(true));
  }, [handle]);

  const handleTip = async () => {
    setTipError(null);
    if (isLoading) return;
    if (!accessToken) {
      router.push(`/login?next=/creators/${handle}`);
      return;
    }
    setTipping(true);
    try {
      const tip = await resolveTip(handle, accessToken);
      const query = new URLSearchParams({
        destination: tip.destinationPublicKey,
        memo: tip.memo,
        amount: tip.suggestedAmount,
      });
      router.push(`/payments?${query.toString()}`);
    } catch (err) {
      setTipError(err instanceof Error ? err.message : 'Could not start your tip');
    } finally {
      setTipping(false);
    }
  };

  if (error) return <main className="page"><p role="alert">Creator not found.</p></main>;
  if (!detail) return <main className="page"><p>Loading…</p></main>;

  const { creator, recentTips } = detail;
  return (
    <main className="page">
      <div className="row row--between">
        <h1>{creator.displayName}</h1>
        <Link href="/creators">All creators</Link>
      </div>
      <section className="card stack" data-testid="creator-profile">
        <p className="muted">@{creator.handle}</p>
        {creator.bio ? <p>{creator.bio}</p> : null}
        <dl className="row">
          <div><dt className="muted">Tips received</dt><dd>{creator.tipsReceived}</dd></div>
          <div style={{ marginLeft: 24 }}><dt className="muted">Total earned</dt><dd>{creator.totalEarnings} XLM</dd></div>
        </dl>
        <button type="button" className="btn btn--primary" onClick={() => void handleTip()} disabled={tipping} data-testid="tip-button">
          {tipping ? 'Preparing…' : `Tip ${creator.displayName}`}
        </button>
        {tipError ? <p className="error-text" role="alert">{tipError}</p> : null}
        <p className="muted">Tips are ordinary Stellar payments with a recognisable memo.</p>
      </section>

      <h2>Recent tips</h2>
      {recentTips.length === 0 ? <p>No tips yet — be the first.</p> : null}
      <ul className="list-reset">
        {recentTips.map((tip) => (
          <li key={tip.id} className="card" style={{ marginBottom: 8 }}>
            <strong>{tip.amount} XLM</strong> <span className="muted">{tip.memo}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
