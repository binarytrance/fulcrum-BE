import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  WEEKLY_ANALYTICS_REPO_PORT,
  type IWeeklyAnalyticsRepository,
} from '@analytics/domain/ports/weekly-analytics-repo.port';
import type { WeeklyAnalytics } from '@analytics/domain/entities/weekly-analytics.entity';

@Injectable()
export class GetWeeklyAnalyticsService {
  constructor(
    @Inject(WEEKLY_ANALYTICS_REPO_PORT)
    private readonly repo: IWeeklyAnalyticsRepository,
  ) {}

  async getByWeek(userId: string, weekStart: string): Promise<WeeklyAnalytics> {
    const doc = await this.repo.findByUserAndWeek(userId, weekStart);
    if (!doc) {
      throw new NotFoundException(
        `No analytics found for week starting ${weekStart}. Weekly analytics are computed every Sunday night.`,
      );
    }
    return doc;
  }

  /** Returns the N most recent weekly summaries, newest first. */
  async getRecent(userId: string, limit = 8): Promise<WeeklyAnalytics[]> {
    return this.repo.findRecentByUser(userId, limit);
  }
}
