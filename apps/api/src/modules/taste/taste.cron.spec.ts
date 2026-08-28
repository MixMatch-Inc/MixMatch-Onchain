import { ConfigService } from '@nestjs/config';
import { TasteCron } from './taste.cron';
import { TasteService } from './taste.service';

describe('TasteCron', () => {
  it('skips ingestion in production', () => {
    const tasteService = { ingestTasteProfiles: jest.fn() };
    const cron = new TasteCron(
      tasteService as unknown as TasteService,
      {
        get: jest.fn().mockReturnValue('production'),
      } as unknown as ConfigService,
    );

    cron.handleDailyTasteIngestion();

    expect(tasteService.ingestTasteProfiles).not.toHaveBeenCalled();
  });

  it('runs ingestion outside production', () => {
    const tasteService = { ingestTasteProfiles: jest.fn() };
    const cron = new TasteCron(
      tasteService as unknown as TasteService,
      {
        get: jest.fn().mockReturnValue('development'),
      } as unknown as ConfigService,
    );

    cron.handleDailyTasteIngestion();

    expect(tasteService.ingestTasteProfiles).toHaveBeenCalledTimes(1);
  });
});
