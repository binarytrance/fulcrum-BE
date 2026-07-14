import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@shared/config/config.service';
import { createRedisConfig } from '@shared/infrastructure/redis/redis.config';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

export const RedisClientProvider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService): Redis => new Redis(createRedisConfig(config)),
};

@Injectable()
export class RedisLifecycle implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  onModuleDestroy() {
    this.redis.disconnect();
  }
}
