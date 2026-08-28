const createDatabaseMock = jest.fn();

jest.mock('./client', () => ({
  createDatabase: (...args: unknown[]) => createDatabaseMock(...args),
}));

import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { DATABASE, DbModule } from './db.module';

describe('DbModule', () => {
  it('creates the database connection from the configured databaseUrl', async () => {
    createDatabaseMock.mockReturnValueOnce({ db: true });

    const moduleRef = await Test.createTestingModule({
      imports: [DbModule],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('postgres://localhost/mixmatch'),
          },
        },
      ],
    }).compile();

    expect(moduleRef.get(DATABASE)).toEqual({ db: true });
    expect(createDatabaseMock).toHaveBeenCalledWith(
      'postgres://localhost/mixmatch',
    );
  });
});
