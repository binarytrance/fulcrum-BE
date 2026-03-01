import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  HABIT_OCCURRENCE_REPO_PORT,
  type IHabitOccurrenceRepository,
} from '@habits/domain/ports/habit-occurrence-repo.port';
import {
  HABIT_REPO_PORT,
  type IHabitRepository,
} from '@habits/domain/ports/habit-repo.port';
import type { HabitOccurrence } from '@habits/domain/entities/habit-occurrence.entity';

@Injectable()
export class GetOccurrencesService {
  constructor(
    @Inject(HABIT_OCCURRENCE_REPO_PORT)
    private readonly occurrenceRepo: IHabitOccurrenceRepository,
    @Inject(HABIT_REPO_PORT) private readonly habitRepo: IHabitRepository,
  ) {}

  /** All today's PENDING occurrences for a user (daily planner). */
  async getDueToday(userId: string): Promise<HabitOccurrence[]> {
    const dateStr = new Date().toISOString().slice(0, 10);
    return this.occurrenceRepo.findDueToday(userId, dateStr);
  }

  /** All occurrences for a specific habit, verified by ownership. */
  async getByHabit(
    habitId: string,
    userId: string,
  ): Promise<HabitOccurrence[]> {
    const habit = await this.habitRepo.findById(habitId);
    if (!habit || habit.deletedAt)
      throw new NotFoundException('Habit not found.');
    if (habit.userId !== userId) throw new ForbiddenException('Access denied.');
    return this.occurrenceRepo.findByHabit(habitId);
  }
}
