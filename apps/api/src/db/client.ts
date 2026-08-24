import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Database = ReturnType<typeof drizzle<typeof schema>>;

/** Builds a Drizzle client against the given Postgres connection string. */
export function createDatabase(databaseUrl: string): Database {
  const client = postgres(databaseUrl);
  return drizzle(client, { schema });
}
