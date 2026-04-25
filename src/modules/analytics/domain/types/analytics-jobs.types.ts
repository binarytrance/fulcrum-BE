export enum AnalyticsJobName {
  /** Compute (or recompute) daily analytics for a user on a given date */
  COMPUTE_DAILY = 'analytics.compute-daily',
  /** Compute (or recompute) goal analytics triggered by a task/session event */
  COMPUTE_GOAL = 'analytics.compute-goal',
  /** Seed a zero-valued analytics doc when a goal is first created */
  INIT_GOAL = 'analytics.init-goal',
  /** Update the rolling 30-task estimation-accuracy profile */
  UPDATE_ESTIMATION = 'analytics.update-estimation',
}

export interface AnalyticsJobPayloads {
  [AnalyticsJobName.COMPUTE_DAILY]: {
    userId: string;
    /** YYYY-MM-DD */
    date: string;
  };
  [AnalyticsJobName.COMPUTE_GOAL]: {
    userId: string;
    /** The task that triggered the recompute — its goalId is looked up */
    taskId: string;
  };
  [AnalyticsJobName.INIT_GOAL]: {
    userId: string;
    goalId: string;
    goalTitle: string;
  };
  [AnalyticsJobName.UPDATE_ESTIMATION]: {
    userId: string;
    taskId: string;
  };
}
