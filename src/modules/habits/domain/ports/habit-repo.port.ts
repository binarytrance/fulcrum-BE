import type { Habit } from '@habits/domain/entities/habit.entity';
import type { HabitStatus } from '@habits/domain/types/habit.types';

export const HABIT_REPO_PORT = Symbol('HABIT_REPO_PORT');

export interface HabitFilter {
  status?: HabitStatus;
  goalId?: string;
  createdAfter?: string;  // YYYY-MM-DD inclusive
  createdBefore?: string; // YYYY-MM-DD inclusive
}

export interface PagedHabits {
  items: Habit[];
  total: number;
}

export interface IHabitRepository {
  create(habit: Habit): Promise<Habit>;
  findById(id: string): Promise<Habit | null>;
  findByUser(userId: string): Promise<Habit[]>;
  findByUserPaged(
    userId: string,
    filter: HabitFilter,
    page: number,
    limit: number,
  ): Promise<PagedHabits>;
  findByGoal(goalId: string): Promise<Habit[]>;
  /** All ACTIVE habits across all users — used by the nightly maintenance job. */
  findAllActive(): Promise<Habit[]>;
  save(habit: Habit): Promise<Habit>;
}
