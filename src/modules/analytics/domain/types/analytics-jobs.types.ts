export enum AnalyticsJobName {
  /** Compute (or recompute) daily analytics for a user on a given date */
  COMPUTE_DAILY = 'analytics.compute-daily',
  /** Compute (or recompute) goal analytics triggered by a task/session event */
  COMPUTE_GOAL = 'analytics.compute-goal',
  /** Compute (or recompute) weekly analytics for a single user */
  COMPUTE_WEEKLY = 'analytics.compute-weekly',
  /** Update the rolling 30-task estimation-accuracy profile */
  UPDATE_ESTIMATION = 'analytics.update-estimation',
  /** Sunday cron: discover all active users and fan-out COMPUTE_WEEKLY jobs */
  COMPUTE_WEEKLY_ALL = 'analytics.compute-weekly-all',
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
  [AnalyticsJobName.COMPUTE_WEEKLY]: {
    userId: string;
    /** YYYY-MM-DD — Monday that starts the week */
    weekStart: string;
  };
  [AnalyticsJobName.UPDATE_ESTIMATION]: {
    userId: string;
    taskId: string;
  };
  [AnalyticsJobName.COMPUTE_WEEKLY_ALL]: Record<string, never>;
}
