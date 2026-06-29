import { DataSource } from 'typeorm';
import Redis from 'ioredis';

export class DbTestUtils {
  static async clearDatabase(dataSource: DataSource): Promise<void> {
    if (!dataSource?.isInitialized) return;

    try {
      const entities = dataSource.entityMetadatas;
      if (!entities?.length) return;

      const tableNames = entities.map((entity) => `"${entity.tableName}"`).join(', ');
      if (tableNames) {
        await dataSource.query(`TRUNCATE TABLE ${tableNames} CASCADE;`);
      }
    } catch (err) {
      console.warn('[DbTestUtils] clearDatabase failed:', err instanceof Error ? err.message : err);
    }
  }

  static async clearRedis(redisClient: Redis): Promise<void> {
    if (!redisClient) return;

    try {
      if (redisClient.status === 'ready') {
        await redisClient.flushall();
      }
    } catch (err) {
      console.warn('[DbTestUtils] clearRedis failed:', err instanceof Error ? err.message : err);
    }
  }
}
