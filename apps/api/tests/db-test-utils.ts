import { DataSource } from 'typeorm';
import Redis from 'ioredis';

export class DbTestUtils {
  /**
   * Drops transactional row states safely across all tables by executing a cascading truncation sequence
   */
  static async clearDatabase(dataSource: DataSource): Promise<void> {
    if (!dataSource.isInitialized) {
      return;
    }

    const entities = dataSource.entityMetadatas;
    const tableNames = entities
      .map((entity) => `"${entity.tableName}"`)
      .join(', ');

    if (tableNames.length > 0) {
      await dataSource.query(`TRUNCATE TABLE ${tableNames} CASCADE;`);
    }
  }

  /**
   * Resets active Redis caches to prevent cross-contamination of rate limit indices or blacklisted sessions
   */
  static async clearRedis(redisClient: Redis): Promise<void> {
    if (redisClient && redisClient.status === 'ready') {
      await redisClient.flushall();
    }
  }
}