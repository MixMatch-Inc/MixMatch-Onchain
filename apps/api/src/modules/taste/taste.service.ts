import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TasteService {
  private readonly logger = new Logger(TasteService.name);

  constructor(private readonly configService: ConfigService) {}

  /** Whether the taste-profile pipeline is ready to run. Gated behind TASTE_PIPELINE_ENABLED=true. */
  isEnabled(): boolean {
    return this.configService.get<string>('TASTE_PIPELINE_ENABLED') === 'true';
  }

  ingestTasteProfiles() {
    if (!this.isEnabled()) {
      this.logger.warn(
        'Taste pipeline is disabled (TASTE_PIPELINE_ENABLED != true). ' +
          'Set TASTE_PIPELINE_ENABLED=true once the pipeline is fully implemented.',
      );
      return;
    }

    this.logger.log('Starting Taste Profile Ingestion...');

    // 1. Fetch all users with active Spotify streaming_connections
    // 2. Iterate and fetch top 50 artists and genres for each user
    // 3. Compute the embeddings (mocked for now)
    // 4. Upsert into taste_profiles table

    this.logger.log('Fetching active streaming connections...');
    // TODO: replace stub with real implementation before enabling
    const usersToProcess = [{ id: 'mock-uuid-1', provider: 'spotify' }];

    for (const user of usersToProcess) {
      this.logger.log(`Processing user ${user.id}...`);
      this.logger.log(`Generated taste embedding for user ${user.id}`);
      // db.insert(tasteProfiles).values({ ... })
    }

    this.logger.log('Taste Profile Ingestion complete.');
  }
}
