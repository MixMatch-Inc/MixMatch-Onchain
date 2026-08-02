import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TasteService } from './taste.service';

@Injectable()
export class TasteCron {
  private readonly logger = new Logger(TasteCron.name);

  constructor(private readonly tasteService: TasteService) {}

  // Run every night at midnight to ingest daily streaming updates
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  handleDailyTasteIngestion() {
    this.logger.log('CRON: Triggering daily taste profile ingestion');
    this.tasteService.ingestTasteProfiles();
  }
}
