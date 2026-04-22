import { Goal } from '@goals/domain/entities/goal.entity';
import { GoalStatus, GoalCategory } from '@goals/domain/types/goal.types';
import type { Pagination } from '@tasks/domain/ports/task-repo.port';

export const GOAL_REPO_PORT = Symbol('GOAL_REPO_PORT');

export interface GoalFilter {
  status?: GoalStatus;
  category?: GoalCategory;
}

export interface GoalStats {
  /** Total non-deleted goals for the user */
  total: number;
  /** Per-status breakdown; every GoalStatus key is always present (0 if none) */
  byStatus: Record<GoalStatus, number>;
}

export interface IGoalRepository {
  create(goal: Goal): Promise<void>;
  findById(id: string): Promise<Goal | null>;
  /** Returns all non-deleted goals for a user — used to build the tree in JS */
  findAllByUserId(userId: string): Promise<Goal[]>;
  findByUserId(
    userId: string,
    filter?: GoalFilter,
    pagination?: Pagination,
  ): Promise<Goal[]>;
  countByUserId(userId: string, filter?: GoalFilter): Promise<number>;
  searchByUserId(
    userId: string,
    q: string,
    pagination: Pagination,
  ): Promise<Goal[]>;
  countSearchByUserId(userId: string, q: string): Promise<number>;
  /** Returns total goal count + per-status breakdown in a single aggregation. */
  getStats(userId: string): Promise<GoalStats>;
  update(goal: Goal): Promise<void>;
  /**
   * Atomically transitions all ACTIVE goals whose estimatedEndDate has passed
   * to MISSED. Returns the number of goals updated.
   */
  markOverdueAsMissed(userId: string): Promise<number>;
  /** Permanently removes the goal and all its descendants from MongoDB. */
  deleteWithDescendants(id: string): Promise<void>;
}
