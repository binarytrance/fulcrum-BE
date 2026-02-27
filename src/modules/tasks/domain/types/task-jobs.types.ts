export enum TaskJobs {
  /** Recompute the linked goal's progress after a task is completed */
  RECOMPUTE_GOAL_PROGRESS = 'tasks.recompute-goal-progress',
  /** Mark today's habit occurrence as complete (Phase: Habits) */
  MARK_HABIT_OCCURRENCE = 'tasks.mark-habit-occurrence',
}

export interface TaskJobPayloads {
  [TaskJobs.RECOMPUTE_GOAL_PROGRESS]: {
    taskId: string;
    goalId: string;
    userId: string;
  };
  [TaskJobs.MARK_HABIT_OCCURRENCE]: {
    taskId: string;
    userId: string;
    /** ISO date string YYYY-MM-DD */
    date: string;
  };
}
