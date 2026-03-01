export enum HabitJobName {
  /**
   * Runs nightly (00:00 UTC):
   * 1. Marks yesterday's PENDING occurrences as MISSED.
   * 2. Creates occurrence for (today + LOOKAHEAD - 1) for every active habit
   *    to maintain the rolling 30-day window.
   */
  NIGHTLY_MAINTENANCE = 'habits.nightly-maintenance',

  /**
   * Recalculates current + longest streak for one habit.
   * Enqueued whenever an occurrence is completed, skipped, or marked missed.
   */
  UPDATE_STREAK = 'habits.update-streak',
}

export interface HabitJobPayloads {
  [HabitJobName.NIGHTLY_MAINTENANCE]: Record<string, never>;
  [HabitJobName.UPDATE_STREAK]: {
    habitId: string;
    userId: string;
    /** YYYY-MM-DD of the occurrence that triggered recalculation */
    date: string;
  };
}
