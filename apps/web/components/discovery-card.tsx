'use client';

import { RevealPhase } from '@mixmatch/types';

export interface DiscoveryCardData {
  id: string;
  stageName: string;
  bio?: string;
  genres: string[];
  vibeTags: string[];
  pricing?: { min: number; max: number };
  availabilityStatus: string;
  location?: string;
  revealPhase: RevealPhase;
  journeyProgress?: number; // 0-100
}

interface DiscoveryCardProps {
  data: DiscoveryCardData;
  onClick?: (id: string) => void;
}

const PHASE_LABEL: Record<RevealPhase, string> = {
  [RevealPhase.BLIND]: 'Blind',
  [RevealPhase.ANONYMOUS]: 'Anonymous',
  [RevealPhase.BASIC]: 'Partial',
  [RevealPhase.FULL]: 'Full',
  [RevealPhase.BLOCKED]: 'Blocked',
};

export function DiscoveryCard({ data, onClick }: DiscoveryCardProps) {
  const isBlind = data.revealPhase === RevealPhase.BLIND;
  const isAnonymous = data.revealPhase === RevealPhase.ANONYMOUS;
  const isBlocked = data.revealPhase === RevealPhase.BLOCKED;

  return (
    <article
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:shadow-md"
      onClick={() => !isBlocked && onClick?.(data.id)}
      role={onClick && !isBlocked ? 'button' : undefined}
      tabIndex={onClick && !isBlocked ? 0 : undefined}
      onKeyDown={(e) => e.key === 'Enter' && !isBlocked && onClick?.(data.id)}
      aria-label={isBlind ? 'Anonymous DJ profile' : `DJ profile: ${data.stageName}`}
    >
      {/* Phase badge */}
      <div className="mb-4 flex items-center justify-between">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            isBlind
              ? 'bg-zinc-900 text-white'
              : isAnonymous
                ? 'bg-zinc-200 text-zinc-700'
                : isBlocked
                  ? 'bg-red-100 text-red-700'
                  : 'bg-emerald-100 text-emerald-700'
          }`}
        >
          {PHASE_LABEL[data.revealPhase]}
        </span>
        {data.pricing && (
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700">
            {data.pricing.min}–{data.pricing.max}
          </span>
        )}
        {!data.pricing && (
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-400">
            Price hidden
          </span>
        )}
      </div>

      {/* Identity fields — hidden in blind mode */}
      {isBlind ? (
        <div aria-hidden="true">
          <div className="h-5 w-32 rounded bg-zinc-200" />
          <div className="mt-2 h-3 w-20 rounded bg-zinc-100" />
        </div>
      ) : (
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">{data.stageName}</h2>
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
            {data.availabilityStatus}
          </p>
        </div>
      )}

      {/* Bio — hidden in blind mode */}
      {!isBlind && data.bio && (
        <p className="mt-3 text-sm text-zinc-600 line-clamp-2">{data.bio}</p>
      )}
      {isBlind && (
        <div className="mt-3 space-y-1.5" aria-hidden="true">
          <div className="h-3 w-full rounded bg-zinc-100" />
          <div className="h-3 w-4/5 rounded bg-zinc-100" />
        </div>
      )}

      {/* Taste-signal badges */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {data.genres.map((g) => (
          <span
            key={g}
            className="rounded-full border border-zinc-200 px-2.5 py-0.5 text-xs text-zinc-700"
          >
            {g}
          </span>
        ))}
        {data.vibeTags.slice(0, 3).map((t) => (
          <span
            key={t}
            className="rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs text-white"
          >
            {t}
          </span>
        ))}
      </div>

      {/* Journey progression bar */}
      {data.journeyProgress !== undefined && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Journey</span>
            <span>{data.journeyProgress}%</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-zinc-900 transition-all"
              style={{ width: `${data.journeyProgress}%` }}
              role="progressbar"
              aria-valuenow={data.journeyProgress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      )}

      {isBlocked && (
        <p className="mt-4 text-xs text-red-600">This profile is unavailable.</p>
      )}
    </article>
  );
}
