export const GOAL_OWNERSHIP_PORT = Symbol('GOAL_OWNERSHIP_PORT');

export interface IGoalOwnershipVerifier {
  /**
   * Resolves if the goal exists and belongs to userId.
   * Throws NotFoundException if not found or belongs to another user.
   */
  verifyOwnership(goalId: string, userId: string): Promise<void>;
}
