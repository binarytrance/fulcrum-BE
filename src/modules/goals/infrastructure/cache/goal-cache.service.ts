import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@shared/infrastructure/redis/redis.provider';

/** TTL for the goal tree cache per user (seconds) */
const TREE_TTL_SECONDS = 30;

@Injectable()
export class GoalCacheService {
  private readonly logger = new Logger(GoalCacheService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  private treeKey(userId: string): string {
    return `goals:tree:${userId}`;
  }

  async getTree<T>(userId: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(this.treeKey(userId));
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.warn(`Cache read failed for user ${userId}: ${String(err)}`);
      return null;
    }
  }

  async setTree<T>(userId: string, tree: T): Promise<void> {
    try {
      await this.redis.set(
        this.treeKey(userId),
        JSON.stringify(tree),
        'EX',
        TREE_TTL_SECONDS,
      );
    } catch (err) {
      this.logger.warn(`Cache write failed for user ${userId}: ${String(err)}`);
    }
  }

  async invalidate(userId: string): Promise<void> {
    try {
      await this.redis.del(this.treeKey(userId));
    } catch (err) {
      this.logger.warn(
        `Cache invalidation failed for user ${userId}: ${String(err)}`,
      );
    }
  }
}
