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

    this.client.on('error', (err) => {
      logger.error('Error connecting to redis', { message: err.message });
    });
    this.client.on('close', () => {
      logger.warn('Redis connection closed');
    });
    this.client.on('ready', () => {
      logger.info('Redis connected and ready');
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
