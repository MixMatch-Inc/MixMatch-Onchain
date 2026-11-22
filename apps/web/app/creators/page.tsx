'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listCreators } from '../../lib/profile-client';
import type { CreatorSummary } from '@mixmatch/shared';

/** Public creator directory (#1379). */
export default function CreatorsPage() {
  const [creators, setCreators] = useState<CreatorSummary[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    listCreators()
      .then(({ creators: rows }) => setCreators(rows))
      .catch(() => setError(true));
  }, []);

  return (
    <main className="page">
      <div className="row row--between">
        <h1>Creators on MixMatch</h1>
        <Link href="/">Home</Link>
      </div>
      {error && <p className="error-text" role="alert">Could not load creators.</p>}
      {!error && creators.length === 0 && <p>No creators yet.</p>}
      <ul className="list-reset" data-testid="creator-list">
        {creators.map((creator) => (
          <li key={creator.handle} className="card" style={{ marginBottom: 12 }}>
            <strong>{creator.displayName}</strong>
            <p className="muted">@{creator.handle}</p>
            {creator.bio ? <p>{creator.bio}</p> : null}
            <Link href={`/creators/${creator.handle}`}>View profile and tip</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
