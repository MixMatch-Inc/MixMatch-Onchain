import { SpotifyProvider, SpotifyTrackResponse } from '../spotify-provider';
import { ProviderType, ITrackReference } from '@mixmatch/types';
import { ProviderConfig } from '../interfaces';
import { ProviderError } from '../types';

// Simple test runner for contract tests
class ContractTestRunner {
  private tests: Array<{ name: string; test: () => Promise<void> }> = [];
  private passed = 0;
  private failed = 0;

  test(name: string, testFn: () => Promise<void>) {
    this.tests.push({ name, test: testFn });
  }

  async run() {
    console.log('🧪 Running Spotify Provider Contract Tests...\n');

    for (const { name, test } of this.tests) {
      try {
        await test();
        console.log(`✅ ${name}`);
        this.passed++;
      } catch (error) {
        console.log(`❌ ${name}`);
        console.log(`   Error: ${error instanceof Error ? error.message : error}`);
        this.failed++;
      }
    }

    console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed`);
    return this.failed === 0;
  }
}

// Mock fetch implementation
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Test data
const mockSpotifyTrack: SpotifyTrackResponse = {
  id: '4iV5W9uYEdYUVa79Axb7Rh',
  name: 'Never Gonna Give You Up',
  artists: [
    {
      id: '0TnOILsLpZXK5gXcBhjTCJ',
      name: 'Rick Astley'
    }
  ],
  album: {
    id: '1A2GTWGtFfWp7KSQTwWOyo',
    name: 'Whenever You Need Somebody',
    release_date: '1987-07-28',
    images: [
      {
        url: 'https://i.scdn.co/image/ab67616d0000b27357c6bb6d3c0e1a3e1a3e1a3e',
        width: 640,
        height: 640
      },
      {
        url: 'https://i.scdn.co/image/ab67616d0000b27357c6bb6d3c0e1a3e1a3e1a3d',
        width: 300,
        height: 300
      }
    ]
  },
  duration_ms: 213000,
  preview_url: 'https://p.scdn.co/mp3-preview/4iV5W9uYEdYUVa79Axb7Rh.mp3',
  explicit: false,
  external_ids: {
    isrc: 'GBUM71705078'
  },
  popularity: 85,
  uri: 'spotify:track:4iV5W9uYEdYUVa79Axb7Rh'
};

// Contract tests
const runner = new ContractTestRunner();

runner.test('Provider should have correct metadata', async () => {
  const config: ProviderConfig = {
    type: ProviderType.SPOTIFY,
    name: 'Test Spotify Provider',
    apiKey: 'test-client-id',
    apiSecret: 'test-client-secret'
  };

  const provider = new SpotifyProvider(config);

  if (provider.type !== ProviderType.SPOTIFY) {
    throw new Error('Provider type should be SPOTIFY');
  }

  if (provider.name !== 'Spotify') {
    throw new Error('Provider name should be Spotify');
  }

  if (!provider.capabilities.canSearch) {
    throw new Error('Provider should support search');
  }

  if (!provider.capabilities.canLookup) {
    throw new Error('Provider should support lookup');
  }

  if (!provider.capabilities.canGetPreview) {
    throw new Error('Provider should support preview');
  }

  if (!provider.capabilities.canGetArtwork) {
    throw new Error('Provider should support artwork');
  }

  if (!provider.capabilities.requiresAuth) {
    throw new Error('Provider should require auth');
  }

  if (!provider.capabilities.supportsOAuth) {
    throw new Error('Provider should support OAuth');
  }
});

runner.test('Provider should validate configuration', async () => {
  try {
    new SpotifyProvider({
      type: ProviderType.SPOTIFY,
      name: 'Invalid Provider'
    });
    throw new Error('Should have thrown validation error');
  } catch (error) {
    if (!(error instanceof ProviderError) || !error.message.includes('API key and secret are required')) {
      throw error;
    }
  }
});

runner.test('Provider should lookup track and normalize correctly', async () => {
  const config: ProviderConfig = {
    type: ProviderType.SPOTIFY,
    name: 'Test Spotify Provider',
    apiKey: 'test-client-id',
    apiSecret: 'test-client-secret'
  };

  const provider = new SpotifyProvider(config);

  const mockTokenResponse = {
    access_token: 'test-access-token',
    token_type: 'Bearer',
    expires_in: 3600,
    scope: 'test-scope'
  };

  mockFetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => mockTokenResponse
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => mockSpotifyTrack
    });

  const result = await provider.lookupTrack({ providerTrackId: '4iV5W9uYEdYUVa79Axb7Rh' });

  if (!result) {
    throw new Error('Should return track data');
  }

  // Verify normalized mapping
  if (result.id !== 'spotify_4iV5W9uYEdYUVa79Axb7Rh') {
    throw new Error('Incorrect track ID mapping');
  }

  if (result.provider !== ProviderType.SPOTIFY) {
    throw new Error('Incorrect provider mapping');
  }

  if (result.providerTrackId !== '4iV5W9uYEdYUVa79Axb7Rh') {
    throw new Error('Incorrect provider track ID mapping');
  }

  if (result.title !== 'Never Gonna Give You Up') {
    throw new Error('Incorrect title mapping');
  }

  if (result.artists.length !== 1) {
    throw new Error('Incorrect artists count');
  }

  if (result.artists[0].name !== 'Rick Astley') {
    throw new Error('Incorrect artist name mapping');
  }

  if (result.artists[0].providerId !== '0TnOILsLpZXK5gXcBhjTCJ') {
    throw new Error('Incorrect artist provider ID mapping');
  }

  if (!result.album) {
    throw new Error('Album should be mapped');
  }

  if (result.album.name !== 'Whenever You Need Somebody') {
    throw new Error('Incorrect album name mapping');
  }

  if (result.album.providerId !== '1A2GTWGtFfWp7KSQTwWOyo') {
    throw new Error('Incorrect album provider ID mapping');
  }

  if (result.durationMs !== 213000) {
    throw new Error('Incorrect duration mapping');
  }

  if (result.previewUrl !== 'https://p.scdn.co/mp3-preview/4iV5W9uYEdYUVa79Axb7Rh.mp3') {
    throw new Error('Incorrect preview URL mapping');
  }

  if (result.artwork.length !== 2) {
    throw new Error('Incorrect artwork count');
  }

  if (result.artwork[0].width !== 640 || result.artwork[0].height !== 640) {
    throw new Error('Incorrect artwork dimensions');
  }

  if (result.explicit !== false) {
    throw new Error('Incorrect explicit flag mapping');
  }

  if (!result.rawPayload) {
    throw new Error('Raw payload should be preserved');
  }
});

runner.test('Provider should handle missing track gracefully', async () => {
  const config: ProviderConfig = {
    type: ProviderType.SPOTIFY,
    name: 'Test Spotify Provider',
    apiKey: 'test-client-id',
    apiSecret: 'test-client-secret'
  };

  const provider = new SpotifyProvider(config);

  const mockTokenResponse = {
    access_token: 'test-access-token',
    token_type: 'Bearer',
    expires_in: 3600,
    scope: 'test-scope'
  };

  mockFetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => mockTokenResponse
    })
    .mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: { message: 'Not found' } })
    });

  const result = await provider.lookupTrack({ providerTrackId: 'non-existent-track' });

  if (result !== null) {
    throw new Error('Should return null for missing track');
  }
});

runner.test('Provider should return preview URL when available', async () => {
  const config: ProviderConfig = {
    type: ProviderType.SPOTIFY,
    name: 'Test Spotify Provider',
    apiKey: 'test-client-id',
    apiSecret: 'test-client-secret'
  };

  const provider = new SpotifyProvider(config);

  const mockTokenResponse = {
    access_token: 'test-access-token',
    token_type: 'Bearer',
    expires_in: 3600,
    scope: 'test-scope'
  };

  mockFetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => mockTokenResponse
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => mockSpotifyTrack
    });

  const result = await provider.getPreviewMetadata({
    trackId: '4iV5W9uYEdYUVa79Axb7Rh',
    provider: ProviderType.SPOTIFY
  });

  if (result !== 'https://p.scdn.co/mp3-preview/4iV5W9uYEdYUVa79Axb7Rh.mp3') {
    throw new Error('Should return preview URL');
  }
});

runner.test('Provider should return null when no preview available', async () => {
  const config: ProviderConfig = {
    type: ProviderType.SPOTIFY,
    name: 'Test Spotify Provider',
    apiKey: 'test-client-id',
    apiSecret: 'test-client-secret'
  };

  const provider = new SpotifyProvider(config);

  const mockTokenResponse = {
    access_token: 'test-access-token',
    token_type: 'Bearer',
    expires_in: 3600,
    scope: 'test-scope'
  };

  const mockTrackWithoutPreview = {
    ...mockSpotifyTrack,
    preview_url: null
  };

  mockFetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => mockTokenResponse
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => mockTrackWithoutPreview
    });

  const result = await provider.getPreviewMetadata({
    trackId: '4iV5W9uYEdYUVa79Axb7Rh',
    provider: ProviderType.SPOTIFY
  });

  if (result !== null) {
    throw new Error('Should return null when no preview available');
  }
});

runner.test('Provider should return appropriate artwork size', async () => {
  const config: ProviderConfig = {
    type: ProviderType.SPOTIFY,
    name: 'Test Spotify Provider',
    apiKey: 'test-client-id',
    apiSecret: 'test-client-secret'
  };

  const provider = new SpotifyProvider(config);

  const mockTokenResponse = {
    access_token: 'test-access-token',
    token_type: 'Bearer',
    expires_in: 3600,
    scope: 'test-scope'
  };

  mockFetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => mockTokenResponse
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => mockSpotifyTrack
    });

  const result = await provider.getArtwork({
    trackId: '4iV5W9uYEdYUVa79Axb7Rh',
    provider: ProviderType.SPOTIFY,
    size: 'medium'
  });

  if (result !== 'https://i.scdn.co/image/ab67616d0000b27357c6bb6d3c0e1a3e1a3e1a3d') {
    throw new Error('Should return medium artwork URL');
  }
});

runner.test('Provider should check account capabilities', async () => {
  const config: ProviderConfig = {
    type: ProviderType.SPOTIFY,
    name: 'Test Spotify Provider',
    apiKey: 'test-client-id',
    apiSecret: 'test-client-secret'
  };

  const provider = new SpotifyProvider(config);

  const mockTokenResponse = {
    access_token: 'test-access-token',
    token_type: 'Bearer',
    expires_in: 3600,
    scope: 'test-scope'
  };

  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => mockTokenResponse
  });

  const result = await provider.checkAccountCapabilities();

  if (!result.canSearch) {
    throw new Error('Should support search');
  }

  if (!result.canLookup) {
    throw new Error('Should support lookup');
  }

  if (!result.canGetPreview) {
    throw new Error('Should support preview');
  }

  if (!result.canGetArtwork) {
    throw new Error('Should support artwork');
  }

  if (!result.requiresAuth) {
    throw new Error('Should require auth');
  }

  if (!result.supportsOAuth) {
    throw new Error('Should support OAuth');
  }
});

// Export for running
export async function runContractTests(): Promise<boolean> {
  return await runner.run();
}

// Run tests if this file is executed directly
if (require.main === module) {
  runContractTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}
