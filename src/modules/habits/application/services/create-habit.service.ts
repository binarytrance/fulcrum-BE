import { Inject, Injectable } from '@nestjs/common';
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
  goalId: string;
  title: string;
  description?: string | null;
  frequency: HabitFrequency;
  daysOfWeek?: number[];
  targetDuration: number;
}

@Injectable()
export class CreateHabitService {
  constructor(
    @Inject(HABIT_REPO_PORT) private readonly habitRepo: IHabitRepository,
    @Inject(HABIT_OCCURRENCE_REPO_PORT)
    private readonly occurrenceRepo: IHabitOccurrenceRepository,
    @Inject(GOAL_ACCESS_PORT) private readonly goalAccess: IGoalAccessPort,
  ) {}

  async execute(input: CreateHabitInput): Promise<Habit> {
    // 1. Verify the goal belongs to the user
    await this.goalAccess.verifyOwnership(input.goalId, input.userId);

    // 2. Build the habit entity
    const now = new Date();
    const habit = new Habit({
      id: randomUUID(),
      userId: input.userId,
      goalId: input.goalId,
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
