import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  HABIT_REPO_PORT,
  type IHabitRepository,
} from '@habits/domain/ports/habit-repo.port';
import {
  HABIT_OCCURRENCE_REPO_PORT,
  type IHabitOccurrenceRepository,
} from '@habits/domain/ports/habit-occurrence-repo.port';
import {
  GOAL_ACCESS_PORT,
  type IGoalAccessPort,
} from '@habits/domain/ports/goal-access.port';
import {
  TASK_CAPACITY_PORT,
  type ITaskCapacityPort,
} from '@habits/domain/ports/task-capacity.port';
import {
  HABIT_CAPACITY_PORT,
  type IHabitCapacityPort,
} from '@habits/domain/ports/habit-capacity.port';
import { Habit } from '@habits/domain/entities/habit.entity';
import { HabitOccurrenceFields } from '@habits/domain/entities/habit-occurrence.entity';
import {
  HabitFrequency,
  HabitStatus,
  OccurrenceStatus,
  OCCURRENCE_LOOKAHEAD_DAYS,
} from '@habits/domain/types/habit.types';

export interface CreateHabitInput {
  userId: string;
  goalId: string | null;
  title: string;
  description?: string | null;
  frequency: HabitFrequency;
  daysOfWeek?: number[];
  targetDuration: number;
}

const MAX_DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class CreateHabitService {
  constructor(
    @Inject(HABIT_REPO_PORT) private readonly habitRepo: IHabitRepository,
    @Inject(HABIT_OCCURRENCE_REPO_PORT)
    private readonly occurrenceRepo: IHabitOccurrenceRepository,
    @Inject(GOAL_ACCESS_PORT) private readonly goalAccess: IGoalAccessPort,
    @Inject(TASK_CAPACITY_PORT) private readonly taskCapacity: ITaskCapacityPort,
    @Inject(HABIT_CAPACITY_PORT)
    private readonly habitCapacity: IHabitCapacityPort,
  ) {}

  async execute(input: CreateHabitInput): Promise<Habit> {
    // 1. Verify the goal belongs to the user (only when goalId is provided)
    if (input.goalId) {
      await this.goalAccess.verifyOwnership(input.goalId, input.userId);
    }

    // 2. Check today's 24h cap if this habit is scheduled for today
    const today = new Date();
    const isScheduledToday =
      input.frequency === HabitFrequency.DAILY ||
      (input.daysOfWeek ?? []).includes(today.getUTCDay());

    if (isScheduledToday) {
      const [taskMs, habitMs] = await Promise.all([
        this.taskCapacity.getCommittedTaskMs(input.userId, today),
        this.habitCapacity.getPendingHabitMs(input.userId, today),
      ]);
      const newHabitMs = input.targetDuration * 60_000;
      if (taskMs + habitMs + newHabitMs > MAX_DAY_MS) {
        const todayStr = today.toISOString().slice(0, 10);
        throw new BadRequestException(
          `Adding this habit would exceed 24 hours of commitment for today (${todayStr}). ` +
            `Free up capacity by removing tasks or habits scheduled for today.`,
        );
      }
    }

    // 3. Build the habit entity
    const now = new Date();
    const habit = new Habit({
      id: randomUUID(),
      userId: input.userId,
      goalId: input.goalId ?? null,
      title: input.title,
      description: input.description ?? null,
      frequency: input.frequency,
      daysOfWeek: input.daysOfWeek ?? [],
      targetDuration: input.targetDuration,
      status: HabitStatus.ACTIVE,
      currentStreak: 0,
      longestStreak: 0,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    const saved = await this.habitRepo.create(habit);

    // 3. Pre-generate the next 30 days of occurrences
    const occurrences = this.generateOccurrences(saved);
    if (occurrences.length) await this.occurrenceRepo.createMany(occurrences);

    return saved;
  }

  private generateOccurrences(habit: Habit): HabitOccurrenceFields[] {
    const results: HabitOccurrenceFields[] = [];
    const now = new Date();

    for (let i = 0; i < OCCURRENCE_LOOKAHEAD_DAYS; i++) {
      const date = new Date(now);
      date.setUTCDate(date.getUTCDate() + i);
      if (!habit.isScheduledForDate(date)) continue;

      const dateStr = date.toISOString().slice(0, 10);
      results.push({
        id: randomUUID(),
        habitId: habit.id,
        userId: habit.userId,
        date: dateStr,
        status: OccurrenceStatus.PENDING,
        completedAt: null,
        sessionId: null,
        durationMinutes: null,
        note: null,
        createdAt: now,
      });
    }
    return results;
  }
}
