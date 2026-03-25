import { Module } from '@nestjs/common';
import { SharedModule } from '@shared/shared.module';
import { AnalyticsMongoModule } from '@analytics/infrastructure/persistence/analytics-mongo.module';
import { AnalyticsWorkersModule } from '@analytics/infrastructure/workers/analytics-workers.module';

import { DAILY_ANALYTICS_REPO_PORT } from '@analytics/domain/ports/daily-analytics-repo.port';
import { GOAL_ANALYTICS_REPO_PORT } from '@analytics/domain/ports/goal-analytics-repo.port';
import { WEEKLY_ANALYTICS_REPO_PORT } from '@analytics/domain/ports/weekly-analytics-repo.port';
import { ESTIMATION_PROFILE_REPO_PORT } from '@analytics/domain/ports/estimation-profile-repo.port';

import { DailyAnalyticsRepository } from '@analytics/infrastructure/persistence/daily-analytics.repository';
import { GoalAnalyticsRepository } from '@analytics/infrastructure/persistence/goal-analytics.repository';
import { WeeklyAnalyticsRepository } from '@analytics/infrastructure/persistence/weekly-analytics.repository';
import { EstimationProfileRepository } from '@analytics/infrastructure/persistence/estimation-profile.repository';

import { GetDailyAnalyticsService } from '@analytics/application/services/get-daily-analytics.service';
import { GetGoalAnalyticsService } from '@analytics/application/services/get-goal-analytics.service';
import { GetWeeklyAnalyticsService } from '@analytics/application/services/get-weekly-analytics.service';
import { GetEstimationProfileService } from '@analytics/application/services/get-estimation-profile.service';
import { GetDashboardService } from '@analytics/application/services/get-dashboard.service';

import { AnalyticsController } from '@analytics/presentation/controllers/analytics.controller';

@Module({
  imports: [SharedModule, AnalyticsMongoModule, AnalyticsWorkersModule],
  controllers: [AnalyticsController],
  providers: [
    { provide: DAILY_ANALYTICS_REPO_PORT, useExisting: DailyAnalyticsRepository },
    { provide: GOAL_ANALYTICS_REPO_PORT, useExisting: GoalAnalyticsRepository },
    { provide: WEEKLY_ANALYTICS_REPO_PORT, useExisting: WeeklyAnalyticsRepository },
    { provide: ESTIMATION_PROFILE_REPO_PORT, useExisting: EstimationProfileRepository },
    GetDailyAnalyticsService,
    GetGoalAnalyticsService,
    GetWeeklyAnalyticsService,
    GetEstimationProfileService,
    GetDashboardService,
  ],
})
export class AnalyticsModule {}
