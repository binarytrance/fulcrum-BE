import type { Habit } from '@habits/domain/entities/habit.entity';

export const HABIT_REPO_PORT = Symbol('HABIT_REPO_PORT');

export interface IHabitRepository {
  create(habit: Habit): Promise<Habit>;
  findById(id: string): Promise<Habit | null>;
  findByUser(userId: string): Promise<Habit[]>;
  findByGoal(goalId: string): Promise<Habit[]>;
  /** All ACTIVE habits across all users — used by the nightly maintenance job. */
  findAllActive(): Promise<Habit[]>;
  save(habit: Habit): Promise<Habit>;
}
