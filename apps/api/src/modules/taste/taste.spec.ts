import { ConfigService } from '@nestjs/config';
import { TasteService } from './taste.service';
import { TasteCron } from './taste.cron';

function buildConfigService(values: Record<string, unknown> = {}): ConfigService {
  return {
    get: jest.fn((key: string) => values[key]),
    getOrThrow: jest.fn((key: string) => {
      if (values[key] === undefined) {
        throw new Error(`Missing config: ${key}`);
      }
      return values[key];
    }),
  } as unknown as ConfigService;
}

describe('TasteService', () => {
  describe('when TASTE_PIPELINE_ENABLED is not set', () => {
    it('isEnabled() returns false', () => {
      const service = new TasteService(buildConfigService());
      expect(service.isEnabled()).toBe(false);
    });

    it('ingestTasteProfiles() returns early without throwing', () => {
      const service = new TasteService(buildConfigService());
      expect(() => service.ingestTasteProfiles()).not.toThrow();
    });
  });

  describe('when TASTE_PIPELINE_ENABLED=true', () => {
    it('isEnabled() returns true', () => {
      const service = new TasteService(
        buildConfigService({ TASTE_PIPELINE_ENABLED: 'true' }),
      );
      expect(service.isEnabled()).toBe(true);
    });

    it('ingestTasteProfiles() runs without throwing', () => {
      const service = new TasteService(
        buildConfigService({ TASTE_PIPELINE_ENABLED: 'true' }),
      );
      expect(() => service.ingestTasteProfiles()).not.toThrow();
    });
  });
});

describe('TasteCron', () => {
  it('calls ingestTasteProfiles on the service when invoked', () => {
    const configService = buildConfigService();
    const tasteService = new TasteService(configService);
    const ingestSpy = jest.spyOn(tasteService, 'ingestTasteProfiles');
    const cron = new TasteCron(tasteService);

    cron.handleDailyTasteIngestion();

    expect(ingestSpy).toHaveBeenCalledTimes(1);
  });

  it('@Cron decorator is configured (schedule wiring check)', () => {
    // Verify the decorator metadata is applied to handleDailyTasteIngestion.
    // If ScheduleModule is not loaded in tests, the cron won't fire, but we
    // can at least confirm the metadata is present on the method.
    const metadata = Reflect.getMetadata(
      'SCHEDULE_CRON_OPTIONS',
      TasteCron.prototype.handleDailyTasteIngestion,
    );
    // The metadata should be truthy (an object with the cron expression)
    expect(metadata).toBeDefined();
  });
});
