import {
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.provider';

@Injectable()
export class RedisHealthMonitor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisHealthMonitor.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  onModuleInit() {
    this.redis.on('connect', () => this.logger.log('Redis connected'));

    this.redis.on('ready', () => this.logger.log('Redis ready'));

    this.redis.on('error', (err) => this.logger.error('Redis error', err));

    this.redis.on('close', () => this.logger.warn('Redis connection closed'));

    this.redis.on('reconnecting', () => this.logger.warn('Redis reconnecting'));
  }

  async onModuleDestroy() {
    await this.redis.quit();
    this.logger.log('Redis connection closed gracefully');
  }
}
