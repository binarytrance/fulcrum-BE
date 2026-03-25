import type { WeeklyAnalytics } from '@analytics/domain/entities/weekly-analytics.entity';

export const WEEKLY_ANALYTICS_REPO_PORT = Symbol('WEEKLY_ANALYTICS_REPO_PORT');

export interface IWeeklyAnalyticsRepository {
  findByUserAndWeek(userId: string, weekStart: string): Promise<WeeklyAnalytics | null>;
  findRecentByUser(userId: string, limit: number): Promise<WeeklyAnalytics[]>;
}
