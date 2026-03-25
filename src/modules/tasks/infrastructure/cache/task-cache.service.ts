import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@shared/infrastructure/redis/redis.provider';
import type { ITaskCachePort } from '@tasks/domain/ports/task-cache.port';

/** TTL for the daily task list cache per user+date (seconds) */
const DAILY_TTL_SECONDS = 60;

@Injectable()
export class TaskCacheService implements ITaskCachePort {
  private readonly logger = new Logger(TaskCacheService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /** Cache key format: tasks:daily:{userId}:{YYYY-MM-DD} */
  private dailyKey(userId: string, date: Date): string {
    const d = date.toISOString().slice(0, 10);
    return `tasks:daily:${userId}:${d}`;
  }

  async getDaily<T>(userId: string, date: Date): Promise<T | null> {
    try {
      const raw = await this.redis.get(this.dailyKey(userId, date));
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.warn(`Cache read failed for user ${userId}: ${String(err)}`);
      return null;
    }
  }

  async setDaily<T>(userId: string, date: Date, data: T): Promise<void> {
    try {
      await this.redis.set(
        this.dailyKey(userId, date),
        JSON.stringify(data),
        'EX',
        DAILY_TTL_SECONDS,
      );
    } catch (err) {
      this.logger.warn(`Cache write failed for user ${userId}: ${String(err)}`);
    }
  }

  async invalidate(userId: string, date: Date | null): Promise<void> {
    if (!date) return;
    try {
      await this.redis.del(this.dailyKey(userId, date));
    } catch (err) {
      this.logger.warn(
        `Cache invalidation failed for user ${userId}: ${String(err)}`,
      );
    }
  }
}
