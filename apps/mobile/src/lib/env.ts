import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
const runtimeProcess = globalThis as {
  process?: {
    env?: Record<string, string | undefined>;
  };
};

const get = (key: string, fallback?: string): string => {
  const val =
    runtimeProcess.process?.env?.[key] ??
    (extra[key] as string | undefined) ??
    fallback;
  if (!val) throw new Error(`Missing env var: ${key}`);
  return val;
};

export const env = {
  apiUrl: get('EXPO_PUBLIC_API_URL', 'http://localhost:3001'),
};
