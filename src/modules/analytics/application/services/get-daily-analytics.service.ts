import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  DAILY_ANALYTICS_REPO_PORT,
  type IDailyAnalyticsRepository,
} from '@analytics/domain/ports/daily-analytics-repo.port';
import type { DailyAnalytics } from '@analytics/domain/entities/daily-analytics.entity';

@Injectable()
export class GetDailyAnalyticsService {
  constructor(
    @Inject(DAILY_ANALYTICS_REPO_PORT)
    private readonly repo: IDailyAnalyticsRepository,
  ) {}

  async getByDate(userId: string, date: string): Promise<DailyAnalytics> {
    const doc = await this.repo.findByUserAndDate(userId, date);
    if (!doc) {
      throw new NotFoundException(
        `No analytics found for ${date}. Analytics are computed after your first session or task of the day.`,
      );
    }
    return doc;
  }

  async getRange(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<DailyAnalytics[]> {
    return this.repo.findByUserInRange(userId, startDate, endDate);
  }
}
