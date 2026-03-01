import type {
  HabitOccurrence,
  HabitOccurrenceFields,
} from '@habits/domain/entities/habit-occurrence.entity';

export const HABIT_OCCURRENCE_REPO_PORT = Symbol('HABIT_OCCURRENCE_REPO_PORT');

export interface IHabitOccurrenceRepository {
  create(occurrence: HabitOccurrence): Promise<HabitOccurrence>;
  /** Bulk-insert for initial occurrence generation — ordered:false for performance. */
  createMany(fields: HabitOccurrenceFields[]): Promise<void>;
  findById(id: string): Promise<HabitOccurrence | null>;
  findByHabit(habitId: string): Promise<HabitOccurrence[]>;
  findByHabitAndDate(
    habitId: string,
    date: string,
  ): Promise<HabitOccurrence | null>;
  /** PENDING occurrences for a user on a specific YYYY-MM-DD date (daily planner). */
  findDueToday(userId: string, date: string): Promise<HabitOccurrence[]>;
  /** All occurrences in a date range — used for analytics and streak calculation. */
  findInDateRange(
    habitId: string,
    from: string,
    to: string,
  ): Promise<HabitOccurrence[]>;
  /** All PENDING occurrences with date strictly before `date` — used by nightly miss-marking. */
  findPendingBefore(date: string): Promise<HabitOccurrence[]>;
  save(occurrence: HabitOccurrence): Promise<HabitOccurrence>;
}
