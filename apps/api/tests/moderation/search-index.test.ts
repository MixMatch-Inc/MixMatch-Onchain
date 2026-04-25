import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ISearchIndex, SearchDocument, SearchResult } from '../../src/repositories/search-index.repository';

// In-memory search index for testing
class InMemorySearchIndex implements ISearchIndex {
  private docs = new Map<string, SearchDocument>();

  async index(doc: SearchDocument): Promise<void> {
    this.docs.set(doc.id, doc);
  }

  async remove(id: string): Promise<void> {
    this.docs.delete(id);
  }

  async search(query: string, options: { type?: SearchDocument['type']; limit?: number } = {}): Promise<SearchResult[]> {
    const q = query.toLowerCase();
    let results = Array.from(this.docs.values())
      .filter((d) => d.text.toLowerCase().includes(q))
      .filter((d) => !options.type || d.type === options.type);

    if (options.limit) results = results.slice(0, options.limit);

    return results.map((d) => ({ id: d.id, type: d.type, score: 1, metadata: d.metadata }));
  }
}

describe('ISearchIndex', () => {
  it('indexes and finds a profile document', async () => {
    const idx = new InMemorySearchIndex();
    await idx.index({ id: 'p1', type: 'profile', text: 'DJ Awesome techno berlin' });
    const results = await idx.search('techno');
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].id, 'p1');
  });

  it('indexes and finds an event document', async () => {
    const idx = new InMemorySearchIndex();
    await idx.index({ id: 'e1', type: 'event', text: 'Summer Festival 2026 outdoor' });
    const results = await idx.search('festival');
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].type, 'event');
  });

  it('filters by type', async () => {
    const idx = new InMemorySearchIndex();
    await idx.index({ id: 'p1', type: 'profile', text: 'house music dj' });
    await idx.index({ id: 'j1', type: 'journey', text: 'house music journey' });
    const results = await idx.search('house', { type: 'profile' });
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].id, 'p1');
  });

  it('remove deletes a document', async () => {
    const idx = new InMemorySearchIndex();
    await idx.index({ id: 'p1', type: 'profile', text: 'afrobeats dj lagos' });
    await idx.remove('p1');
    const results = await idx.search('afrobeats');
    assert.strictEqual(results.length, 0);
  });

  it('re-indexing updates the document', async () => {
    const idx = new InMemorySearchIndex();
    await idx.index({ id: 'p1', type: 'profile', text: 'old text' });
    await idx.index({ id: 'p1', type: 'profile', text: 'new text updated' });
    const results = await idx.search('updated');
    assert.strictEqual(results.length, 1);
  });
});
