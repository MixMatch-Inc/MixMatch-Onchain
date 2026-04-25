export interface SearchDocument {
  id: string;
  type: 'profile' | 'journey' | 'event';
  text: string; // concatenated searchable text
  metadata?: Record<string, unknown>;
}

export interface SearchResult {
  id: string;
  type: SearchDocument['type'];
  score: number;
  metadata?: Record<string, unknown>;
}

export interface ISearchIndex {
  /** Index or re-index a document. */
  index(doc: SearchDocument): Promise<void>;
  /** Remove a document from the index. */
  remove(id: string): Promise<void>;
  /** Full-text search. Returns results ordered by relevance. */
  search(query: string, options?: { type?: SearchDocument['type']; limit?: number }): Promise<SearchResult[]>;
}
