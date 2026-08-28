const drizzleMock = jest.fn();
const postgresMock = jest.fn();

jest.mock('drizzle-orm/postgres-js', () => ({
  drizzle: (...args: unknown[]) => drizzleMock(...args),
}));

jest.mock('postgres', () => ({
  __esModule: true,
  default: (...args: unknown[]) => postgresMock(...args),
}));

import { createDatabase } from './client';

describe('createDatabase', () => {
  it('builds a drizzle client from the given connection string', () => {
    const databaseUrl = 'postgres://localhost/mixmatch';
    const client = { db: true };
    postgresMock.mockReturnValueOnce(client);
    drizzleMock.mockReturnValueOnce('database');

    expect(createDatabase(databaseUrl)).toBe('database');
    expect(postgresMock).toHaveBeenCalledWith(databaseUrl);
    expect(drizzleMock).toHaveBeenCalledWith(client, { schema: expect.any(Object) });
  });
});
