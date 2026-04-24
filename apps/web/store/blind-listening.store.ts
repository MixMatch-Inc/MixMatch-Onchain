'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface BlindListeningStore {
  blindMode: boolean;
  enable: () => void;
  disable: () => void;
  toggle: () => void;
}

export const useBlindListeningStore = create<BlindListeningStore>()(
  persist(
    (set) => ({
      blindMode: false,
      enable: () => set({ blindMode: true }),
      disable: () => set({ blindMode: false }),
      toggle: () => set((s) => ({ blindMode: !s.blindMode })),
    }),
    {
      name: 'mixmatch-blind-listening',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
