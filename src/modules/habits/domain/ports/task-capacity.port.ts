export const TASK_CAPACITY_PORT = Symbol('TASK_CAPACITY_PORT');

export interface ITaskCapacityPort {
  /**
   * Returns the total estimatedDuration (in ms) of all tasks committed for
   * the given user on the given date (scheduled tasks + unplanned tasks created that day).
   */
  getCommittedTaskMs(userId: string, date: Date): Promise<number>;
}
