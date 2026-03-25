export const HABIT_STREAK_CACHE_PORT = Symbol('HABIT_STREAK_CACHE_PORT');

export interface IHabitStreakCachePort {
  get(habitId: string): Promise<number | null>;
  set(habitId: string, currentStreak: number): Promise<void>;
  del(habitId: string): Promise<void>;
}