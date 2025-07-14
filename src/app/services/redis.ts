import Redis from 'ioredis';
import { env } from '~/data/env';
import { logger } from '~/app/services/logger';

export class RedisProvider {
  private static instance: RedisProvider;
  public client: Redis;

  private constructor() {
    this.client = new Redis({
      host: env.STORAGE.REDIS_HOST,
      port: env.STORAGE.REDIS_PORT,
      password: env.STORAGE.REDIS_PASSWORD,
      retryStrategy: (times) => {
        if (times > 5) {
          logger.error('Too many reconnecting attempts to redis');
          return null;
        }
        const delay = Math.min(times * 200, 2000);
        logger.warn(`Reconnecting to redis in ${delay}ms, attempt: ${times}`);
        return delay;
      },
    });
  }

  public async ping() {
    this.client.ping((err, result) => {
      if (err) {
        logger.error('Redis PING failed', { message: err.message });
      } else {
        logger.info('Redis PING successful', { result });
      }
    });
  }

  public static getInstance() {
    if (!RedisProvider.instance) {
      RedisProvider.instance = new RedisProvider();
    }
    return RedisProvider.instance;
  }

  public async close() {
    await this.client.quit();
    logger.info('Redis connection closed gracefully.');
  }
}
