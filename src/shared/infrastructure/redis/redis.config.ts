import { RedisOptions } from 'ioredis';
import { ConfigService } from '@shared/config/config.service';

export const createRedisConfig = (config: ConfigService): RedisOptions => {
  return {
    host: config.redis.host,
    port: config.redis.port,
    username: config.redis.username,
    password: config.redis.password,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 1000, 5000);
      return delay;
    },
    // Required for BullMQ stability
    maxRetriesPerRequest: null,

    connectTimeout: 10000,
    commandTimeout: 5000,
    keepAlive: 10000,
    tls: config.isProd ? {} : undefined,
    enableReadyCheck: true,
    enableOfflineQueue: false,
  };
};
