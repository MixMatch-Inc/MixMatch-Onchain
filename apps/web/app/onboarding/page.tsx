'use client';

import type { OnboardingProgress } from '@mixmatch/shared';
import { ONBOARDING_STEPS } from '@mixmatch/shared';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'mixmatch.onboarding';
const COPY: Record<string, { title: string; body: string }> = {
  profile: { title: 'Make it yours', body: 'Add a display name, bio and photo so other listeners recognise you.' },
  music: { title: 'Share your sound', body: 'Explore creators and send your first tip from their profile.' },
  wallet: { title: 'Set up your wallet', body: 'Create a Stellar wallet from the Wallet page and keep your public address handy.' },
  fund: { title: 'Get started on testnet', body: 'Fund your testnet wallet with Friendbot, then send a small payment.' },
};

export default function OnboardingPage() {
  const router = useRouter();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const progress = JSON.parse(raw) as OnboardingProgress;
      if (progress.skipped) {
        router.replace('/payments');
        return;
      }
      setIndex(Math.min(progress.completed.length, ONBOARDING_STEPS.length - 1));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [router]);

  const save = (skipped: boolean) => {
    const step = ONBOARDING_STEPS[index];
    const raw = window.localStorage.getItem(STORAGE_KEY);
    let current: OnboardingProgress = { completed: [], skipped: false, updatedAt: '' };
    if (raw) {
      try {
        current = JSON.parse(raw) as OnboardingProgress;
      } catch {
        current = { completed: [], skipped: false, updatedAt: '' };
      }
    }
    const next: OnboardingProgress = {
      completed: skipped ? current.completed : Array.from(new Set([...current.completed, step])),
      skipped,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    if (skipped || index + 1 >= ONBOARDING_STEPS.length) {
      router.push('/payments');
    } else {
      setIndex(index + 1);
    }
  };

  const step = ONBOARDING_STEPS[index];

  return (
    <main className="page page--narrow" data-testid="onboarding-screen">
      <div className="stack">
        <p>Step {index + 1} of {ONBOARDING_STEPS.length}</p>
        <h1>{COPY[step].title}</h1>
        <p className="muted">{COPY[step].body}</p>
        <button type="button" className="btn btn--primary" onClick={() => save(false)} data-testid="onboarding-next">
          Continue
        </button>
        <button type="button" className="btn" onClick={() => save(true)} data-testid="onboarding-skip">
          Skip for now
        </button>
      </div>
    </main>
  );
}
