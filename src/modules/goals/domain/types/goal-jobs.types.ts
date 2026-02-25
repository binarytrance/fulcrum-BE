export enum GoalJobs {
  RECALCULATE_PACING = 'goals.recalculate-pacing',
  RECOMPUTE_PROGRESS = 'goals.recompute-progress',
}

export interface GoalJobPayloads {
  [GoalJobs.RECALCULATE_PACING]: {
    goalId: string;
    userId: string;
  };
  [GoalJobs.RECOMPUTE_PROGRESS]: {
    goalId: string;
    userId: string;
  };
}
