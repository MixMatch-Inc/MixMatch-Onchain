'use client';

import { useBlindListeningStore } from '@/store/blind-listening.store';

export function BlindListeningToggle() {
  const blindMode = useBlindListeningStore((s) => s.blindMode);
  const toggle = useBlindListeningStore((s) => s.toggle);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={blindMode}
      className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
        blindMode
          ? 'bg-zinc-900 text-white'
          : 'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
      }`}
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${blindMode ? 'bg-white' : 'bg-zinc-400'}`}
        aria-hidden="true"
      />
      {blindMode ? 'Blind mode on' : 'Blind mode off'}
    </button>
  );
}
