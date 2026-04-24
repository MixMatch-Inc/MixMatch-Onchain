// Mock fetch globally for tests
global.fetch = jest.fn();

// Mock btoa for base64 encoding
global.btoa = jest.fn((str: string) => {
  return Buffer.from(str).toString('base64');
});

// Setup test environment
beforeEach(() => {
  jest.clearAllMocks();
});
