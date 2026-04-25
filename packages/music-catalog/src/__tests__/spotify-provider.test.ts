import { SpotifyProvider, SpotifyTrackResponse } from '../spotify-provider';
import { ProviderType } from '@mixmatch/types';
import { ProviderConfig } from '../interfaces';
import { ProviderError } from '../types';

// Mock fetch for testing
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('SpotifyProvider Contract Tests', () => {
  let provider: SpotifyProvider;
  let mockConfig: ProviderConfig;

  beforeEach(() => {
    mockConfig = {
      type: ProviderType.SPOTIFY,
      name: 'Test Spotify Provider',
      apiKey: 'test-client-id',
      apiSecret: 'test-client-secret',
      baseURL: 'https://api.spotify.com/v1'
    };

    provider = new SpotifyProvider(mockConfig);
    mockFetch.mockClear();
  });

  describe('Provider Configuration', () => {
    it('should have correct provider metadata', () => {
      expect(provider.type).toBe(ProviderType.SPOTIFY);
      expect(provider.name).toBe('Spotify');
      expect(provider.capabilities.canSearch).toBe(true);
      expect(provider.capabilities.canLookup).toBe(true);
      expect(provider.capabilities.canGetPreview).toBe(true);
      expect(provider.capabilities.canGetArtwork).toBe(true);
      expect(provider.capabilities.requiresAuth).toBe(true);
      expect(provider.capabilities.supportsOAuth).toBe(true);
    });

    it('should validate configuration requirements', () => {
      expect(() => new SpotifyProvider({
        type: ProviderType.SPOTIFY,
        name: 'Invalid Provider'
      })).toThrow('Spotify API key and secret are required');
    });

    it('should accept valid configuration', () => {
      expect(() => new SpotifyProvider(mockConfig)).not.toThrow();
    });
  });

  describe('Token Management', () => {
    it('should obtain access token on first request', async () => {
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
          json: async () => ({ id: 'test-track-id' })
        });

      await provider.lookupTrack({ providerTrackId: 'test-track-id' });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://accounts.spotify.com/api/token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': expect.stringMatching(/^Basic .+/),
            'Content-Type': 'application/x-www-form-urlencoded'
          }),
          body: 'grant_type=client_credentials'
        })
      );
    });

    it('should reuse token for subsequent requests', async () => {
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
          json: async () => ({ id: 'test-track-1' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'test-track-2' })
        });

      await provider.lookupTrack({ providerTrackId: 'test-track-1' });
      await provider.lookupTrack({ providerTrackId: 'test-track-2' });

      // Should only call token endpoint once
      const tokenCalls = mockFetch.mock.calls.filter(call => 
        call[0] === 'https://accounts.spotify.com/api/token'
      );
      expect(tokenCalls).toHaveLength(1);
    });

    it('should handle token errors appropriately', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: 'invalid_client',
          error_description: 'Invalid client credentials'
        })
      });

      await expect(provider.lookupTrack({ providerTrackId: 'test-track-id' }))
        .rejects.toThrow(ProviderError);
    });
  });

  describe('Track Lookup', () => {
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

    it('should lookup track by provider ID and normalize correctly', async () => {
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

      expect(result).not.toBeNull();
      expect(result!.id).toBe('spotify_4iV5W9uYEdYUVa79Axb7Rh');
      expect(result!.provider).toBe(ProviderType.SPOTIFY);
      expect(result!.providerTrackId).toBe('4iV5W9uYEdYUVa79Axb7Rh');
      expect(result!.title).toBe('Never Gonna Give You Up');
      expect(result!.artists).toHaveLength(1);
      expect(result!.artists[0].name).toBe('Rick Astley');
      expect(result!.artists[0].providerId).toBe('0TnOILsLpZXK5gXcBhjTCJ');
      expect(result!.album!.name).toBe('Whenever You Need Somebody');
      expect(result!.album!.providerId).toBe('1A2GTWGtFfWp7KSQTwWOyo');
      expect(result!.album!.releaseDate).toEqual(new Date('1987-07-28'));
      expect(result!.durationMs).toBe(213000);
      expect(result!.previewUrl).toBe('https://p.scdn.co/mp3-preview/4iV5W9uYEdYUVa79Axb7Rh.mp3');
      expect(result!.artwork).toHaveLength(2);
      expect(result!.artwork[0].url).toBe('https://i.scdn.co/image/ab67616d0000b27357c6bb6d3c0e1a3e1a3e1a3e');
      expect(result!.artwork[0].width).toBe(640);
      expect(result!.artwork[0].height).toBe(640);
      expect(result!.explicit).toBe(false);
      expect(result!.rawPayload).toEqual(mockSpotifyTrack);
    });

    it('should handle missing track gracefully', async () => {
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

      expect(result).toBeNull();
    });

    it('should include market parameter when provided', async () => {
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

      await provider.lookupTrack({ 
        providerTrackId: '4iV5W9uYEdYUVa79Axb7Rh',
        market: 'US'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.spotify.com/v1/tracks/4iV5W9uYEdYUVa79Axb7Rh?market=US',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-access-token',
            'Content-Type': 'application/json'
          })
        })
      );
    });
  });

  describe('Preview Metadata Retrieval', () => {
    it('should return preview URL when available', async () => {
      const mockTokenResponse = {
        access_token: 'test-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'test-scope'
      };

      const mockTrackWithPreview = {
        ...mockSpotifyTrack,
        preview_url: 'https://p.scdn.co/mp3-preview/test-preview.mp3'
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTrackWithPreview
        });

      const result = await provider.getPreviewMetadata({
        trackId: '4iV5W9uYEdYUVa79Axb7Rh',
        provider: ProviderType.SPOTIFY
      });

      expect(result).toBe('https://p.scdn.co/mp3-preview/test-preview.mp3');
    });

    it('should return null when no preview available', async () => {
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

      expect(result).toBeNull();
    });
  });

  describe('Artwork Retrieval', () => {
    it('should return appropriate artwork size', async () => {
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

      expect(result).toBe('https://i.scdn.co/image/ab67616d0000b27357c6bb6d3c0e1a3e1a3e1a3d');
    });

    it('should return largest artwork when size not available', async () => {
      const mockTokenResponse = {
        access_token: 'test-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'test-scope'
      };

      const mockTrackWithSmallImages = {
        ...mockSpotifyTrack,
        album: {
          ...mockSpotifyTrack.album,
          images: [
            {
              url: 'https://i.scdn.co/image/small-image',
              width: 64,
              height: 64
            }
          ]
        }
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTrackWithSmallImages
        });

      const result = await provider.getArtwork({
        trackId: '4iV5W9uYEdYUVa79Axb7Rh',
        provider: ProviderType.SPOTIFY,
        size: 'large'
      });

      expect(result).toBe('https://i.scdn.co/image/small-image');
    });

    it('should return null when no artwork available', async () => {
      const mockTokenResponse = {
        access_token: 'test-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'test-scope'
      };

      const mockTrackWithoutImages = {
        ...mockSpotifyTrack,
        album: {
          ...mockSpotifyTrack.album,
          images: []
        }
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTrackWithoutImages
        });

      const result = await provider.getArtwork({
        trackId: '4iV5W9uYEdYUVa79Axb7Rh',
        provider: ProviderType.SPOTIFY
      });

      expect(result).toBeNull();
    });
  });

  describe('Account Capabilities Check', () => {
    it('should return capabilities when authentication succeeds', async () => {
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

      expect(result).toEqual(provider.capabilities);
    });

    it('should throw error when authentication fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: 'invalid_client',
          error_description: 'Invalid client credentials'
        })
      });

      await expect(provider.checkAccountCapabilities())
        .rejects.toThrow(ProviderError);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors appropriately', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(provider.lookupTrack({ providerTrackId: 'test-track-id' }))
        .rejects.toThrow(ProviderError);
    });

    it('should handle API errors with proper error details', async () => {
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
          status: 429,
          json: async () => ({
            error: {
              message: 'Rate limit exceeded',
              status: 429
            }
          })
        });

      await expect(provider.lookupTrack({ providerTrackId: 'test-track-id' }))
        .rejects.toThrow(ProviderError);
    });
  });
});
