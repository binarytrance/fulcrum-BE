import { Goal } from '@goals/domain/entities/goal.entity';
import { GoalStatus, GoalCategory } from '@goals/domain/types/goal.types';

export const GOAL_REPO_PORT = Symbol('GOAL_REPO_PORT');

export interface GoalFilter {
  status?: GoalStatus;
  category?: GoalCategory;
}

export interface IGoalRepository {
  create(goal: Goal): Promise<void>;
  findById(id: string): Promise<Goal | null>;
  /** Returns all non-deleted goals for a user — used to build the tree in JS */
  findAllByUserId(userId: string): Promise<Goal[]>;
  findByUserId(userId: string, filter?: GoalFilter): Promise<Goal[]>;
  update(goal: Goal): Promise<void>;
  /** Soft-deletes the goal and all its descendants */
  softDeleteWithDescendants(id: string): Promise<void>;
}
