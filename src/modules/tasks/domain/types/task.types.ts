export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TaskPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

/**
 * PLANNED  — the user scheduled this task intentionally (may or may not link to a goal).
 * UNPLANNED — arose during the day without prior scheduling.
 *             Tracked separately in analytics: high unplanned % = time-leak signal.
 */
export enum TaskType {
  PLANNED = 'PLANNED',
  UNPLANNED = 'UNPLANNED',
}

/**
 * Allowed status transitions.
 * Completion is handled by the dedicated /complete endpoint, which also
 * computes actualDuration + efficiencyScore — do not transition to COMPLETED
 * via a regular PATCH update.
 */
export const TASK_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.PENDING]: [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
  [TaskStatus.IN_PROGRESS]: [
    TaskStatus.PENDING,
    TaskStatus.COMPLETED,
    TaskStatus.CANCELLED,
  ],
  [TaskStatus.COMPLETED]: [TaskStatus.PENDING],
  [TaskStatus.CANCELLED]: [],
};

export interface TaskFields {
  id: string;
  userId: string;
  /** null = standalone / unplanned task (not linked to any goal) */
  goalId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  /** Date on which the user plans to work on this task */
  scheduledFor: Date | null;
  /** Time-box the user sets upfront, in minutes */
  estimatedDuration: number;
  /** Computed from sum of session durations on completion (Phase 4: sessions) */
  actualDuration: number | null;
  /**
   * (estimatedDuration / actualDuration) * 100
   * >100 = finished faster than estimated (efficient)
   * <100 = took longer than estimated (over-run)
   */
  efficiencyScore: number | null;
  completedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
