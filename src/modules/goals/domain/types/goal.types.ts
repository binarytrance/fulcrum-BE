export enum GoalCategory {
  HEALTH_FITNESS = 'HEALTH_FITNESS',
  LEARNING = 'LEARNING',
  CAREER = 'CAREER',
  FINANCE = 'FINANCE',
  RELATIONSHIPS = 'RELATIONSHIPS',
  PERSONAL_GROWTH = 'PERSONAL_GROWTH',
  CREATIVITY = 'CREATIVITY',
  TRAVEL = 'TRAVEL',
  OTHER = 'OTHER',
}

export enum GoalStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED',
  ABANDONED = 'ABANDONED',
  MISSED = 'MISSED',
}

export enum GoalPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

/**
 * Stored on the goal document and recomputed by the background progress worker
 * after every session ends. Reads are always fast — no aggregation on the hot path.
 */
export interface GoalProgress {
  /** Total tasks belonging to this goal (direct + descendant) */
  totalTasks: number;
  /** Completed tasks */
  completedTasks: number;
  /** Sum of all session durations in milliseconds */
  totalLoggedMs: number;
  /** 0–100, computed as completedTasks / max(totalTasks, 1) * 100 — updated in background */
  score: number;
  /** Timestamp of the last background recomputation */
  lastComputedAt: Date;
}

export const INITIAL_PROGRESS: GoalProgress = {
  totalTasks: 0,
  completedTasks: 0,
  totalLoggedMs: 0,
  score: 0,
  lastComputedAt: new Date(0),
};

/**
 * Allowed status transitions.
 * Key = current status, Value = set of statuses it may transition to.
 */
export const GOAL_STATUS_TRANSITIONS: Record<GoalStatus, GoalStatus[]> = {
  [GoalStatus.ACTIVE]: [
    GoalStatus.PAUSED,
    GoalStatus.COMPLETED,
    GoalStatus.ABANDONED,
  ],
  [GoalStatus.PAUSED]: [GoalStatus.ACTIVE, GoalStatus.ABANDONED],
  [GoalStatus.COMPLETED]: [GoalStatus.ACTIVE],
  [GoalStatus.ABANDONED]: [],
  // User can reactivate a missed goal (e.g. after extending the deadline)
  [GoalStatus.MISSED]: [GoalStatus.ACTIVE, GoalStatus.ABANDONED],
};

export interface GoalFields {
  id: string;
  userId: string;
  /** null = top-level goal */
  parentGoalId: string | null;
  title: string;
  description: string | null;
  category: GoalCategory;
  status: GoalStatus;
  priority: GoalPriority;
  /** Planned end date for the goal; null = no deadline set */
  estimatedEndDate: Date | null;
  /** Estimated duration to complete this goal in milliseconds; null = not set */
  estimatedDuration: number | null;
  /** When the user plans to start the goal; null = not set */
  estimatedStartDate: Date | null;
  /** Actual date the goal was started; null = not yet started */
  actualStartDate: Date | null;
  /** Date the goal was completed or abandoned; null = still in progress */
  actualEndDate: Date | null;
  /**
   * Nesting level:
   *  1 = top-level Goal
   *  2 = Sub-Goal
   *  3 = Sub-Sub-Goal (deepest allowed)
   */
  level: 1 | 2 | 3;
  /** Initialised at creation with all zeros; recomputed in the background */
  progress: GoalProgress;
  /** null = not deleted (soft delete) */
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
