export const ANALYTICS_EVENT_PUBLISHER_PORT = Symbol(
  'ANALYTICS_EVENT_PUBLISHER_PORT',
);

export interface IAnalyticsEventPublisher {
  queueDailyCompute(userId: string, date: string): Promise<void>;
  queueGoalCompute(userId: string, taskId: string): Promise<void>;
  queueEstimationUpdate(userId: string, taskId: string): Promise<void>;
}
