import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DbModule, DATABASE } from './db.module';

describe('DbModule', () => {
  it('resolves the DATABASE token via the factory when databaseUrl is provided', async () => {
    // Stub createDatabase so no real Postgres connection is attempted
    jest.mock('./client', () => ({
      createDatabase: jest.fn(() => ({ __mock: true })),
    }));

    const module = await Test.createTestingModule({
      imports: [DbModule],
    })
      .overrideProvider(ConfigService)
      .useValue({
        getOrThrow: jest.fn((key: string) => {
          if (key === 'databaseUrl') return 'postgres://localhost/test';
          throw new Error(`Unexpected config key: ${key}`);
        }),
        get: jest.fn(),
      })
      .compile();

    const db = module.get(DATABASE);
    expect(db).toBeDefined();
  });

  it('throws when DATABASE_URL is missing', async () => {
    const moduleRef = Test.createTestingModule({
      imports: [DbModule],
    }).overrideProvider(ConfigService).useValue({
      getOrThrow: jest.fn(() => {
        throw new Error('Missing required environment variable: DATABASE_URL');
      }),
      get: jest.fn(),
    });

    await expect(moduleRef.compile()).rejects.toThrow(/DATABASE_URL/);
  });
});
