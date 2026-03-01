export const GOAL_ACCESS_PORT = Symbol('GOAL_ACCESS_PORT');

export interface IGoalAccessPort {
  /**
   * Throws NotFoundException if the goal doesn't exist (or is deleted),
   * and ForbiddenException if it doesn't belong to the given user.
   */
  verifyOwnership(goalId: string, userId: string): Promise<void>;
}
