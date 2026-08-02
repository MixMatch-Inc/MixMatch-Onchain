import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TasteService } from './taste.service';
import { TasteCron } from './taste.cron';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [TasteService, TasteCron],
  exports: [TasteService],
})
export class TasteModule {}
