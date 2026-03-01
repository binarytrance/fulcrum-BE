import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { HABITS_QUEUE_NAME } from '@habits/infrastructure/event-publisher/habit-event-publisher';
import {
  HabitJobName,
  type HabitJobPayloads,
} from '@habits/domain/types/habit-jobs.types';
import {
  HABIT_REPO_PORT,
  type IHabitRepository,
} from '@habits/domain/ports/habit-repo.port';
import {
  HABIT_OCCURRENCE_REPO_PORT,
  type IHabitOccurrenceRepository,
} from '@habits/domain/ports/habit-occurrence-repo.port';
import { HabitStreakCache } from '@habits/infrastructure/cache/habit-streak.cache';
import {
  OccurrenceStatus,
  OCCURRENCE_LOOKAHEAD_DAYS,
} from '@habits/domain/types/habit.types';
import type { HabitOccurrenceFields } from '@habits/domain/entities/habit-occurrence.entity';

// ─── Date helpers (UTC-safe) ─────────────────────────────────────────────────

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

// ─── Worker ──────────────────────────────────────────────────────────────────

type HabitJobUnion =
  | Job<HabitJobPayloads[HabitJobName.NIGHTLY_MAINTENANCE]>
  | Job<HabitJobPayloads[HabitJobName.UPDATE_STREAK]>;

@Processor(HABITS_QUEUE_NAME)
@Injectable()
export class HabitWorker extends WorkerHost {
  private readonly logger = new Logger(HabitWorker.name);

  constructor(
    @Inject(HABIT_REPO_PORT) private readonly habitRepo: IHabitRepository,
    @Inject(HABIT_OCCURRENCE_REPO_PORT)
    private readonly occurrenceRepo: IHabitOccurrenceRepository,
    private readonly streakCache: HabitStreakCache,
  ) {
    super();
  }

  async process(job: HabitJobUnion): Promise<void> {
    this.logger.log(`Processing job ${job.id} — ${job.name}`);
    switch (job.name as HabitJobName) {
      case HabitJobName.NIGHTLY_MAINTENANCE:
        return this.handleNightlyMaintenance();

      case HabitJobName.UPDATE_STREAK: {
        const { habitId } =
          job.data as HabitJobPayloads[HabitJobName.UPDATE_STREAK];
        return this.handleUpdateStreak(habitId);
      }

      default:
        this.logger.warn(`Unknown habit job: ${job.name}`);
    }
  }

  // ─── NIGHTLY_MAINTENANCE ─────────────────────────────────────────────────

  private async handleNightlyMaintenance(): Promise<void> {
    const today = new Date();
    const todayStr = toDateStr(today);

    // 1. Mark all PENDING occurrences before today as MISSED
    const stale = await this.occurrenceRepo.findPendingBefore(todayStr);
    let missedCount = 0;
    for (const occ of stale) {
      const missed = occ.miss();
      await this.occurrenceRepo.save(missed);
      await this.streakCache.del(occ.habitId);
      missedCount++;
    }

    // 2. Extend rolling window: create occurrence for (today + LOOKAHEAD - 1)
    //    so the window always covers 30 days ahead.
    const futureDate = addDays(today, OCCURRENCE_LOOKAHEAD_DAYS - 1);
    const futureDateStr = toDateStr(futureDate);

    const activeHabits = await this.habitRepo.findAllActive();
    const toCreate: HabitOccurrenceFields[] = [];

    for (const habit of activeHabits) {
      if (!habit.isScheduledForDate(futureDate)) continue;
      const existing = await this.occurrenceRepo.findByHabitAndDate(
        habit.id,
        futureDateStr,
      );
      if (!existing) {
        toCreate.push({
          id: randomUUID(),
          habitId: habit.id,
          userId: habit.userId,
          date: futureDateStr,
          status: OccurrenceStatus.PENDING,
          completedAt: null,
          sessionId: null,
          durationMinutes: null,
          note: null,
          createdAt: new Date(),
        });
      }
    }

    if (toCreate.length) await this.occurrenceRepo.createMany(toCreate);

    this.logger.log(
      `Nightly maintenance complete — missed: ${missedCount}, created: ${toCreate.length}`,
    );
  }

  // ─── UPDATE_STREAK ───────────────────────────────────────────────────────

  private async handleUpdateStreak(habitId: string): Promise<void> {
    const habit = await this.habitRepo.findById(habitId);
    if (!habit) return;

    const today = new Date();
    const lookbackDate = addDays(today, -365);
    const occurrences = await this.occurrenceRepo.findInDateRange(
      habitId,
      toDateStr(lookbackDate),
      toDateStr(today),
    );

    // Build date → status map for O(1) lookup
    const statusMap = new Map<string, OccurrenceStatus>();
    for (const o of occurrences) statusMap.set(o.date, o.status);

    // Walk backwards from yesterday counting consecutive completed/skipped scheduled days
    let currentStreak = 0;
    let d = addDays(today, -1);

    while (d >= lookbackDate) {
      if (!habit.isScheduledForDate(d)) {
        // Non-scheduled day: skip without breaking streak
        d = addDays(d, -1);
        continue;
      }
      const status = statusMap.get(toDateStr(d));
      if (
        status === OccurrenceStatus.COMPLETED ||
        status === OccurrenceStatus.SKIPPED
      ) {
        currentStreak++;
      } else {
        break; // MISSED or no record → streak ends
      }
      d = addDays(d, -1);
    }

    const longestStreak = Math.max(habit.longestStreak, currentStreak);
    const updated = habit.withStreaks(currentStreak, longestStreak);
    await this.habitRepo.save(updated);
    await this.streakCache.set(habitId, currentStreak);

    this.logger.log(
      `[Streak] habit=${habitId} current=${currentStreak} longest=${longestStreak}`,
    );
  }

  @OnWorkerEvent('ready')
  onReady() {
    this.logger.log('Habit worker connected');
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job completed: ${job.id} — ${job.name}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job) {
    this.logger.error(`Job failed: ${job.id} — ${job.name}`, job.failedReason);
  }
}
