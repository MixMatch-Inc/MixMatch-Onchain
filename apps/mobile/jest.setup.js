// In-memory async mock for expo-secure-store, mirroring its real API shape
// closely enough for tests (the real module requires a native binding).
const secureStore = {};

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key) => secureStore[key] ?? null),
  setItemAsync: jest.fn(async (key, value) => {
    secureStore[key] = value;
  }),
  deleteItemAsync: jest.fn(async (key) => {
    delete secureStore[key];
  }),
  // Test-only helper — not part of the real expo-secure-store API.
  __reset: () => {
    Object.keys(secureStore).forEach((key) => delete secureStore[key]);
  },
}));
