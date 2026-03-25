import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  GOAL_ANALYTICS_REPO_PORT,
  type IGoalAnalyticsRepository,
} from '@analytics/domain/ports/goal-analytics-repo.port';
import type { GoalAnalytics } from '@analytics/domain/entities/goal-analytics.entity';

@Injectable()
export class GetGoalAnalyticsService {
  constructor(
    @Inject(GOAL_ANALYTICS_REPO_PORT)
    private readonly repo: IGoalAnalyticsRepository,
  ) {}

  async getByGoalId(goalId: string): Promise<GoalAnalytics> {
    const doc = await this.repo.findByGoalId(goalId);
    if (!doc) {
      throw new NotFoundException(
        `No analytics found for goal ${goalId}. Analytics are computed after the first session logged against this goal.`,
      );
    }
    return doc;
  }

  async getAllForUser(userId: string): Promise<GoalAnalytics[]> {
    return this.repo.findByUserId(userId);
  }
}
