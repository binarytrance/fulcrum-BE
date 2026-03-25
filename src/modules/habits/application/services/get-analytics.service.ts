import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  HABIT_REPO_PORT,
  type IHabitRepository,
} from '@habits/domain/ports/habit-repo.port';
import {
  HABIT_OCCURRENCE_REPO_PORT,
  type IHabitOccurrenceRepository,
} from '@habits/domain/ports/habit-occurrence-repo.port';
import {
  HABIT_STREAK_CACHE_PORT,
  type IHabitStreakCachePort,
} from '@habits/domain/ports/habit-streak-cache.port';
import { OccurrenceStatus } from '@habits/domain/types/habit.types';

export interface HabitAnalytics {
  habitId: string;
  currentStreak: number;
  longestStreak: number;
  /** 0–100 over the last 30 days */
  completionRatePct: number;
  totalCompleted: number;
  totalMissed: number;
  totalSkipped: number;
  avgDurationMinutes: number | null;
  /** Day-of-week (0=Sun…6=Sat) with highest miss rate; null if insufficient data */
  mostMissedDayOfWeek: number | null;
}

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class GetAnalyticsService {
  constructor(
    @Inject(HABIT_REPO_PORT) private readonly habitRepo: IHabitRepository,
    @Inject(HABIT_OCCURRENCE_REPO_PORT)
    private readonly occurrenceRepo: IHabitOccurrenceRepository,
    @Inject(HABIT_STREAK_CACHE_PORT)
    private readonly streakCache: IHabitStreakCachePort,
  ) {}

  async execute(habitId: string, userId: string): Promise<HabitAnalytics> {
    const habit = await this.habitRepo.findById(habitId);
    if (!habit || habit.deletedAt)
      throw new NotFoundException('Habit not found.');
    if (habit.userId !== userId) throw new ForbiddenException('Access denied.');

    // Pull last 30 days of occurrences
    const today = new Date();
    const from = new Date(today);
    from.setUTCDate(from.getUTCDate() - 30);
    const occurrences = await this.occurrenceRepo.findInDateRange(
      habitId,
      toDateStr(from),
      toDateStr(today),
    );

    const completed = occurrences.filter(
      (o) => o.status === OccurrenceStatus.COMPLETED,
    );
    const missed = occurrences.filter(
      (o) => o.status === OccurrenceStatus.MISSED,
    );
    const skipped = occurrences.filter(
      (o) => o.status === OccurrenceStatus.SKIPPED,
    );

    const denominator = completed.length + missed.length;
    const completionRatePct =
      denominator > 0 ? Math.round((completed.length / denominator) * 100) : 0;

    const durations = completed
      .map((o) => o.durationMinutes)
      .filter((d): d is number => d !== null);
    const avgDurationMinutes =
      durations.length > 0
        ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
        : null;

    // Day-of-week miss analysis (UTC)
    const missedByDay = new Array<number>(7).fill(0);
    for (const o of missed) {
      const dow = new Date(o.date + 'T00:00:00Z').getUTCDay();
      missedByDay[dow]++;
    }
    const maxMisses = Math.max(...missedByDay);
    const mostMissedDayOfWeek =
      maxMisses > 0 ? missedByDay.indexOf(maxMisses) : null;

    // Current streak: prefer Redis cache, fall back to habit entity field
    const cachedStreak = await this.streakCache.get(habitId);
    const currentStreak = cachedStreak ?? habit.currentStreak;

    return {
      habitId,
      currentStreak,
      longestStreak: habit.longestStreak,
      completionRatePct,
      totalCompleted: completed.length,
      totalMissed: missed.length,
      totalSkipped: skipped.length,
      avgDurationMinutes,
      mostMissedDayOfWeek,
    };
  }
}
