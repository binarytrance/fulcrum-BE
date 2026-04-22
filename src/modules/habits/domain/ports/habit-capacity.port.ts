export const HABIT_CAPACITY_PORT = Symbol('HABIT_CAPACITY_PORT');

export interface IHabitCapacityPort {
  /**
   * Returns the total targetDuration (in ms) of all PENDING habit occurrences
   * for the given user on the given date.
   */
  getPendingHabitMs(userId: string, date: Date): Promise<number>;
}
