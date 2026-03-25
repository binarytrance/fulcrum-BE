import type { DailyAnalytics } from '@analytics/domain/entities/daily-analytics.entity';

export const DAILY_ANALYTICS_REPO_PORT = Symbol('DAILY_ANALYTICS_REPO_PORT');

export interface IDailyAnalyticsRepository {
  findByUserAndDate(
    userId: string,
    date: string,
  ): Promise<DailyAnalytics | null>;
  findByUserInRange(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<DailyAnalytics[]>;
}
