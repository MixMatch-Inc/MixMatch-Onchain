import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

export interface BlindListeningStore {
  blindMode: boolean;
  enabledAt: Date | null;
  enable: () => void;
  disable: () => void;
  toggle: () => void;
}

const expoSecureStorage = {
  getItem: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // ignore
    }
  },
  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // ignore
    }
  },
};

export const useBlindListeningStore = create<BlindListeningStore>()(
  persist(
    (set) => ({
      blindMode: false,
      enabledAt: null,
      enable: () => set({ blindMode: true, enabledAt: new Date() }),
      disable: () => set({ blindMode: false, enabledAt: null }),
      toggle: () => set((s) => ({ blindMode: !s.blindMode, enabledAt: s.blindMode ? null : new Date() })),
    }),
    {
      name: 'mixmatch-blind-listening',
      storage: createJSONStorage(() => expoSecureStorage),
    },
  ),
);