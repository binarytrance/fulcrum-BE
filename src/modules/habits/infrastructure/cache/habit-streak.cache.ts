import { Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '@shared/infrastructure/redis/redis.provider';
import { STREAK_CACHE_TTL_SECONDS } from '@habits/domain/types/habit.types';

@Injectable()
export class HabitStreakCache {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  private static key(habitId: string): string {
    return `habit:streak:${habitId}`;
  }

  async set(habitId: string, currentStreak: number): Promise<void> {
    await this.redis.set(
      HabitStreakCache.key(habitId),
      currentStreak.toString(),
      'EX',
      STREAK_CACHE_TTL_SECONDS,
    );
  }

  async get(habitId: string): Promise<number | null> {
    const val = await this.redis.get(HabitStreakCache.key(habitId));
    return val !== null ? parseInt(val, 10) : null;
  }

  async del(habitId: string): Promise<void> {
    await this.redis.del(HabitStreakCache.key(habitId));
  }
}
