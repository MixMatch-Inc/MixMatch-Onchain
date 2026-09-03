import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * #903: `TasteService.ingestTasteProfiles` is currently a non-functional stub.
 * Running it on a nightly cron in production would silently process mock data
 * and log success, giving the appearance of real work. The method now throws
 * explicitly so the cron failure is visible in logs, and the service is
 * clearly marked as not-yet-implemented.
 */
@Injectable()
export class TasteService {
  private readonly logger = new Logger(TasteService.name);

  ingestTasteProfiles(): void {
    this.logger.warn(
      'TasteService.ingestTasteProfiles is not yet implemented — ' +
        'skipping nightly ingestion. Implement Spotify API integration before enabling this cron in production.',
    );
    // TODO: Implement real taste profile ingestion:
    // 1. Fetch all users with active streaming_connections (provider = 'spotify' | 'apple_music')
    // 2. For each user, call the provider API to fetch top 50 artists & genres
    // 3. Compute embeddings
    // 4. Upsert into taste_profiles table
    throw new Error(
      'TasteService.ingestTasteProfiles is not yet implemented',
    );
  }
}
