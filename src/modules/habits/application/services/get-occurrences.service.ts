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
import type { Habit } from '@habits/domain/entities/habit.entity';

export interface DueTodayEntry {
  habit: Habit;
  occurrence: HabitOccurrence;
}

@Injectable()
export class GetOccurrencesService {
  constructor(
    @Inject(HABIT_OCCURRENCE_REPO_PORT)
    private readonly occurrenceRepo: IHabitOccurrenceRepository,
    @Inject(HABIT_REPO_PORT) private readonly habitRepo: IHabitRepository,
  ) {}

  /** All today's PENDING occurrences for a user, merged with their habit data. */
  async getDueToday(userId: string): Promise<DueTodayEntry[]> {
    const dateStr = new Date().toISOString().slice(0, 10);
    const [occurrences, habits] = await Promise.all([
      this.occurrenceRepo.findDueToday(userId, dateStr),
      this.habitRepo.findByUser(userId),
    ]);
    const habitMap = new Map(habits.map((h) => [h.id, h]));
    return occurrences
      .filter((o) => habitMap.has(o.habitId))
      .map((o) => ({ habit: habitMap.get(o.habitId)!, occurrence: o }));
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
