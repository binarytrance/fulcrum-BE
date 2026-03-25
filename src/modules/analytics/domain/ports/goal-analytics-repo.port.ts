import type { GoalAnalytics } from '@analytics/domain/entities/goal-analytics.entity';

export const GOAL_ANALYTICS_REPO_PORT = Symbol('GOAL_ANALYTICS_REPO_PORT');

export interface IGoalAnalyticsRepository {
  findByGoalId(goalId: string): Promise<GoalAnalytics | null>;
  findByUserId(userId: string): Promise<GoalAnalytics[]>;
}
