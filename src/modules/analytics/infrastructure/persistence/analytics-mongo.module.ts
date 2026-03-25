import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  DailyAnalyticsDoc,
  DailyAnalyticsSchema,
} from '@analytics/infrastructure/persistence/daily-analytics.schema';
import {
  GoalAnalyticsDoc,
  GoalAnalyticsSchema,
} from '@analytics/infrastructure/persistence/goal-analytics.schema';
import {
  WeeklyAnalyticsDoc,
  WeeklyAnalyticsSchema,
} from '@analytics/infrastructure/persistence/weekly-analytics.schema';
import {
  EstimationProfileDoc,
  EstimationProfileSchema,
} from '@analytics/infrastructure/persistence/estimation-profile.schema';
import { DailyAnalyticsRepository } from '@analytics/infrastructure/persistence/daily-analytics.repository';
import { GoalAnalyticsRepository } from '@analytics/infrastructure/persistence/goal-analytics.repository';
import { WeeklyAnalyticsRepository } from '@analytics/infrastructure/persistence/weekly-analytics.repository';
import { EstimationProfileRepository } from '@analytics/infrastructure/persistence/estimation-profile.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DailyAnalyticsDoc.name, schema: DailyAnalyticsSchema },
      { name: GoalAnalyticsDoc.name, schema: GoalAnalyticsSchema },
      { name: WeeklyAnalyticsDoc.name, schema: WeeklyAnalyticsSchema },
      { name: EstimationProfileDoc.name, schema: EstimationProfileSchema },
    ]),
  ],
  providers: [
    DailyAnalyticsRepository,
    GoalAnalyticsRepository,
    WeeklyAnalyticsRepository,
    EstimationProfileRepository,
  ],
  exports: [
    MongooseModule,
    DailyAnalyticsRepository,
    GoalAnalyticsRepository,
    WeeklyAnalyticsRepository,
    EstimationProfileRepository,
  ],
})
export class AnalyticsMongoModule {}
