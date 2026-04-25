# MixMatch Music Catalog Service

A provider-agnostic music catalog service that supports multiple music providers through a unified interface.

## Features

- **Provider-Agnostic Interface**: Support for multiple music providers (Spotify, Apple Music, etc.)
- **Normalized Track Data**: Consistent track reference model across all providers
- **Search & Lookup**: Track search, lookup, preview metadata, and artwork retrieval
- **Token Management**: Automatic token refresh and authentication handling
- **Error Handling**: Comprehensive error handling with provider-specific error details
- **Metrics Tracking**: Built-in metrics for monitoring provider performance

## Packages

### `@mixmatch/music-catalog`

The main package containing:
- Core interfaces and types
- Base provider classes
- Music catalog service implementation
- Spotify provider adapter

### Provider Adapters

#### Spotify Provider

The Spotify provider adapter includes:
- Track search by query, artist, album, genre
- Track lookup by Spotify ID
- Preview metadata retrieval
- Artwork retrieval in multiple sizes
- OAuth token management
- Rate limiting support

## Usage

### Basic Setup

```typescript
import { createMusicCatalogService, createSpotifyProvider } from '@mixmatch/music-catalog';
import { ProviderType } from '@mixmatch/types';

// Create the catalog service
const catalogService = createMusicCatalogService();

// Register Spotify provider
const spotifyProvider = createSpotifyProvider({
  type: ProviderType.SPOTIFY,
  name: 'Spotify',
  apiKey: process.env.SPOTIFY_CLIENT_ID,
  apiSecret: process.env.SPOTIFY_CLIENT_SECRET
});

catalogService.registerProvider(spotifyProvider);
```

### Track Lookup

```typescript
// Look up a track by Spotify ID
const track = await catalogService.lookupTrack({
  providerTrackId: '4iV5W9uYEdYUVa79Axb7Rh',
  market: 'US'
}, ProviderType.SPOTIFY);

if (track) {
  console.log(`Found: ${track.title} by ${track.artists[0].name}`);
}
```

### Track Search

```typescript
// Search for tracks
const searchResults = await catalogService.searchTracks({
  query: 'Never Gonna Give You Up',
  limit: 10,
  market: 'US'
}, ProviderType.SPOTIFY);

console.log(`Found ${searchResults.total} tracks`);
```

### Preview Metadata

```typescript
// Get preview URL
const previewUrl = await catalogService.getPreviewMetadata({
  trackId: '4iV5W9uYEdYUVa79Axb7Rh',
  provider: ProviderType.SPOTIFY
});

if (previewUrl) {
  console.log(`Preview available at: ${previewUrl}`);
}
```

### Artwork Retrieval

```typescript
// Get artwork URL
const artworkUrl = await catalogService.getArtwork({
  trackId: '4iV5W9uYEdYUVa79Axb7Rh',
  provider: ProviderType.SPOTIFY,
  size: 'large'
});

if (artworkUrl) {
  console.log(`Artwork available at: ${artworkUrl}`);
}
```

## Contract Tests

The Spotify provider includes comprehensive contract tests to ensure proper functionality:

### Running Tests

```bash
# Install dependencies
pnpm install

# Run contract tests
pnpm run test:contracts

# Run with ts-node directly
npx ts-node src/__tests__/run-contracts.ts
```

### Test Coverage

The contract tests verify:

- ✅ Provider metadata and capabilities
- ✅ Configuration validation
- ✅ Track lookup with normalized mapping
- ✅ Preview metadata retrieval
- ✅ Artwork retrieval with size selection
- ✅ Account capability checks
- ✅ Error handling for missing tracks
- ✅ Token management
- ✅ API authentication

### Acceptance Criteria

All contract tests pass, validating that:

1. **Track Lookup**: Spotify adapter can look up tracks by provider ID
2. **Normalized Mapping**: Includes preview/artwork/artist data in standardized format
3. **Contract Compliance**: All provider interface methods work correctly
4. **Error Handling**: Proper error responses for missing/invalid tracks
5. **Authentication**: Server-side track metadata retrieval works with OAuth

## Provider Interface

### Implementing a New Provider

```typescript
import { BaseMusicProvider } from '@mixmatch/music-catalog';
import { ProviderType } from '@mixmatch/types';

class CustomProvider extends BaseMusicProvider {
  readonly type = ProviderType.CUSTOM;
  readonly name = 'Custom Provider';
  readonly capabilities = {
    canSearch: true,
    canLookup: true,
    canGetPreview: false,
    canGetArtwork: false,
    requiresAuth: false,
    supportsOAuth: false
  };

  async searchTracks(params) {
    // Implement search logic
  }

  async lookupTrack(params) {
    // Implement lookup logic
  }

  async getPreviewMetadata(params) {
    // Implement preview logic
  }

  async getArtwork(params) {
    // Implement artwork logic
  }

  async checkAccountCapabilities() {
    // Implement capability check
  }
}
```

## Error Handling

The service provides comprehensive error handling:

```typescript
import { ProviderError } from '@mixmatch/music-catalog';

try {
  const track = await catalogService.lookupTrack(params);
} catch (error) {
  if (error instanceof ProviderError) {
    console.error(`Provider error: ${error.code} - ${error.message}`);
    console.error(`Status: ${error.status}`);
    console.error(`Details:`, error.details);
  }
}
```

## Metrics

Monitor provider performance:

```typescript
// Get metrics for a specific provider
const metrics = catalogService.getMetrics(ProviderType.SPOTIFY);

console.log(`Requests: ${metrics.requestCount}`);
console.log(`Errors: ${metrics.errorCount}`);
console.log(`Avg Response Time: ${metrics.averageResponseTime}ms`);
```

## Environment Variables

```bash
# Spotify Provider
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
```

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Run contract tests
pnpm run test:contracts

# Build
pnpm build
```

## License

Internal MixMatch package - not for external distribution.
