import Redis from 'ioredis';
import { ConfigService } from '@shared/config/config.service';
import { createRedisConfig } from '@shared/infrastructure/redis/redis.config';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

export const RedisProvider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    return new Redis(createRedisConfig(config));
  },
};
