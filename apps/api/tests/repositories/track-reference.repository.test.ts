import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ITrackReferenceRepository, ITrackReference, ProviderType, CreateTrackReferenceDto } from '../../src/repositories';

// In-memory double for testing
class InMemoryTrackReferenceRepository implements ITrackReferenceRepository {
  private tracks: Map<string, ITrackReference> = new Map();
  private providerMap: Map<string, string> = new Map(); // provider:providerTrackId -> id

  private getProviderKey(provider: ProviderType, providerTrackId: string): string {
    return `${provider}:${providerTrackId}`;
  }

  async findById(id: string): Promise<ITrackReference | null> {
    return this.tracks.get(id) || null;
  }

  async findAll(filter?: Partial<ITrackReference>): Promise<ITrackReference[]> {
    let tracks = Array.from(this.tracks.values());
    if (filter) {
      tracks = tracks.filter((track) => {
        return Object.entries(filter).every(([key, value]) => track[key as keyof ITrackReference] === value);
      });
    }
    return tracks;
  }

  async create(data: Partial<ITrackReference>): Promise<ITrackReference> {
    const id = `track-${this.tracks.size + 1}`;
    const track: ITrackReference = {
      id,
      provider: data.provider || ProviderType.SPOTIFY,
      providerTrackId: data.providerTrackId || '',
      title: data.title || '',
      artists: data.artists || [],
      album: data.album,
      durationMs: data.durationMs || 0,
      previewUrl: data.previewUrl,
      artwork: data.artwork || [],
      explicit: data.explicit || false,
      audioFeaturesCacheKey: data.audioFeaturesCacheKey,
      rawPayload: data.rawPayload || {},
      ingestedAt: data.ingestedAt || new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.tracks.set(id, track);
    if (track.provider && track.providerTrackId) {
      this.providerMap.set(this.getProviderKey(track.provider, track.providerTrackId), id);
    }
    return track;
  }

  async update(id: string, data: Partial<ITrackReference>): Promise<ITrackReference | null> {
    const track = this.tracks.get(id);
    if (!track) return null;
    const updated = { ...track, ...data, updatedAt: new Date() };
    this.tracks.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const track = this.tracks.get(id);
    if (!track) return false;
    this.providerMap.delete(this.getProviderKey(track.provider, track.providerTrackId));
    return this.tracks.delete(id);
  }

  async findByProviderAndId(provider: ProviderType, providerTrackId: string): Promise<ITrackReference | null> {
    const id = this.providerMap.get(this.getProviderKey(provider, providerTrackId));
    return id ? this.tracks.get(id) || null : null;
  }

  async upsert(dto: CreateTrackReferenceDto): Promise<ITrackReference> {
    const existingId = this.providerMap.get(this.getProviderKey(dto.provider, dto.providerTrackId));
    if (existingId) {
      // Update existing
      const existing = this.tracks.get(existingId);
      if (!existing) throw new Error('Inconsistent state');
      const updated: ITrackReference = {
        ...existing,
        ...dto,
        ingestedAt: new Date(), // Update ingestedAt on upsert
        updatedAt: new Date(),
      };
      this.tracks.set(existingId, updated);
      return updated;
    } else {
      // Create new
      return this.create(dto);
    }
  }

  async search(query: string, limit: number = 10): Promise<ITrackReference[]> {
    const tracks = Array.from(this.tracks.values());
    const filtered = tracks.filter((track) =>
      track.title.toLowerCase().includes(query.toLowerCase()) ||
      track.artists.some((artist) => artist.name.toLowerCase().includes(query.toLowerCase()))
    );
    return filtered.slice(0, limit);
  }

  async findRecent(limit: number = 10): Promise<ITrackReference[]> {
    const tracks = Array.from(this.tracks.values());
    tracks.sort((a, b) => b.ingestedAt.getTime() - a.ingestedAt.getTime());
    return tracks.slice(0, limit);
  }
}

describe('InMemoryTrackReferenceRepository', () => {
  it('should create and find a track reference', async () => {
    const repo = new InMemoryTrackReferenceRepository();
    const track = await repo.create({
      provider: ProviderType.SPOTIFY,
      providerTrackId: '123',
      title: 'Test Track',
      artists: [{ name: 'Test Artist' }],
      durationMs: 180000,
      artwork: [{ url: 'http://example.com/art.jpg' }],
      explicit: false,
      rawPayload: { spotifyData: 'test' },
    });

    assert.ok(track.id);
    assert.strictEqual(track.title, 'Test Track');
    assert.strictEqual(track.provider, ProviderType.SPOTIFY);
    assert.strictEqual(track.providerTrackId, '123');

    const found = await repo.findById(track.id);
    assert.ok(found);
    assert.strictEqual(found?.title, 'Test Track');
  });

  it('should find track by provider and provider track ID', async () => {
    const repo = new InMemoryTrackReferenceRepository();
    await repo.create({
      provider: ProviderType.SPOTIFY,
      providerTrackId: '123',
      title: 'Test Track',
      artists: [{ name: 'Test Artist' }],
      durationMs: 180000,
      artwork: [{ url: 'http://example.com/art.jpg' }],
      explicit: false,
      rawPayload: { spotifyData: 'test' },
    });

    const found = await repo.findByProviderAndId(ProviderType.SPOTIFY, '123');
    assert.ok(found);
    assert.strictEqual(found?.title, 'Test Track');
  });

  it('should upsert - insert new track', async () => {
    const repo = new InMemoryTrackReferenceRepository();
    const dto: CreateTrackReferenceDto = {
      provider: ProviderType.SPOTIFY,
      providerTrackId: '123',
      title: 'Test Track',
      artists: [{ name: 'Test Artist' }],
      durationMs: 180000,
      artwork: [{ url: 'http://example.com/art.jpg' }],
      explicit: false,
      rawPayload: { spotifyData: 'test' },
    };

    const track = await repo.upsert(dto);
    assert.ok(track.id);
    assert.strictEqual(track.title, 'Test Track');

    // Verify it can be found
    const found = await repo.findByProviderAndId(ProviderType.SPOTIFY, '123');
    assert.ok(found);
    assert.strictEqual(found?.id, track.id);
  });

  it('should upsert - update existing track', async () => {
    const repo = new InMemoryTrackReferenceRepository();
    const dto: CreateTrackReferenceDto = {
      provider: ProviderType.SPOTIFY,
      providerTrackId: '123',
      title: 'Test Track',
      artists: [{ name: 'Test Artist' }],
      durationMs: 180000,
      artwork: [{ url: 'http://example.com/art.jpg' }],
      explicit: false,
      rawPayload: { spotifyData: 'test' },
    };

    // Insert
    const track1 = await repo.upsert(dto);
    assert.strictEqual(track1.title, 'Test Track');

    // Update
    const updateDto: CreateTrackReferenceDto = {
      ...dto,
      title: 'Updated Track',
      durationMs: 200000,
    };
    const track2 = await repo.upsert(updateDto);

    assert.strictEqual(track2.id, track1.id);
    assert.strictEqual(track2.title, 'Updated Track');
    assert.strictEqual(track2.durationMs, 200000);
    assert.ok(track2.updatedAt > track1.updatedAt);
  });

  it('should search tracks', async () => {
    const repo = new InMemoryTrackReferenceRepository();
    await repo.create({
      provider: ProviderType.SPOTIFY,
      providerTrackId: '1',
      title: 'Rock Song',
      artists: [{ name: 'Rock Band' }],
      durationMs: 180000,
      artwork: [],
      explicit: false,
      rawPayload: {},
    });
    await repo.create({
      provider: ProviderType.SPOTIFY,
      providerTrackId: '2',
      title: 'Pop Song',
      artists: [{ name: 'Pop Artist' }],
      durationMs: 180000,
      artwork: [],
      explicit: false,
      rawPayload: {},
    });

    const results = await repo.search('Rock');
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].title, 'Rock Song');

    const results2 = await repo.search('Artist');
    assert.strictEqual(results2.length, 1);
    assert.strictEqual(results2[0].title, 'Pop Song');
  });

  it('should find recent tracks', async () => {
    const repo = new InMemoryTrackReferenceRepository();
    const now = new Date();
    await repo.create({
      provider: ProviderType.SPOTIFY,
      providerTrackId: '1',
      title: 'Old Track',
      artists: [{ name: 'Artist' }],
      durationMs: 180000,
      artwork: [],
      explicit: false,
      rawPayload: {},
      ingestedAt: new Date(now.getTime() - 1000),
    });
    await repo.create({
      provider: ProviderType.SPOTIFY,
      providerTrackId: '2',
      title: 'New Track',
      artists: [{ name: 'Artist' }],
      durationMs: 180000,
      artwork: [],
      explicit: false,
      rawPayload: {},
      ingestedAt: now,
    });

    const results = await repo.findRecent(1);
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].title, 'New Track');
  });
});