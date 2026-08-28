import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TasteService } from './taste.service';

@Injectable()
export class TasteCron {
  private readonly logger = new Logger(TasteCron.name);

  constructor(
    private readonly tasteService: TasteService,
    private readonly configService: ConfigService,
  ) {}

  // Run every night at midnight to ingest daily streaming updates
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  handleDailyTasteIngestion() {
    if (this.configService.get<string>('nodeEnv') === 'production') {
      this.logger.warn('Skipping taste ingestion cron in production');
      return;
    }
    this.logger.log('CRON: Triggering daily taste profile ingestion');
    this.tasteService.ingestTasteProfiles();
  }
}
