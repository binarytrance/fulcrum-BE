/**
 * Narrow port for task data needed by the sessions domain.
 * Deliberately avoids importing anything from @tasks —
 * the adapter queries MongoDB directly with a string model name.
 */
export const TASK_ACCESS_PORT = Symbol('TASK_ACCESS_PORT');

export interface ITaskAccessPort {
  /**
   * Verifies the task exists, belongs to userId, and is not deleted.
   * Throws NotFoundException if not found.
   */
  verifyOwnership(taskId: string, userId: string): Promise<void>;

  /**
   * Returns the task's estimatedDuration in minutes.
   * Throws NotFoundException if not found.
   */
  getEstimatedDuration(taskId: string, userId: string): Promise<number>;

  /**
   * Persists the actual duration after a session completes.
   * Sums all completed sessions for the task and writes back.
   */
  updateActualDuration(taskId: string, durationMinutes: number): Promise<void>;
}
