import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

import { SharedModule } from '@shared/shared.module';
import { AnalyticsMongoModule } from '@analytics/infrastructure/persistence/analytics-mongo.module';
import { AnalyticsWorker } from '@analytics/infrastructure/workers/analytics.worker';
import {
  AnalyticsEventPublisher,
  ANALYTICS_QUEUE_NAME,
} from '@analytics/infrastructure/event-publisher/analytics-event-publisher';
import { ANALYTICS_EVENT_PUBLISHER_PORT } from '@analytics/domain/ports/analytics-event-publisher.port';
import { ComputeDailyAnalyticsService } from '@analytics/application/services/compute-daily-analytics.service';

// Cross-module Mongoose models required by AnalyticsWorker
import { SessionMongoModule } from '@sessions/infrastructure/persistence/session-mongo.module';
import { TaskMongoModule } from '@tasks/infrastructure/persistence/task-mongo.module';
import { GoalMongoModule } from '@goals/infrastructure/persistence/goal-mongo.module';
import { HabitMongoModule } from '@habits/infrastructure/persistence/habit-mongo.module';

@Module({
  imports: [
    SharedModule,
    AnalyticsMongoModule,
    SessionMongoModule,
    TaskMongoModule,
    GoalMongoModule,
    HabitMongoModule,
    BullModule.registerQueue({ name: ANALYTICS_QUEUE_NAME }),
    BullBoardModule.forFeature({
      name: ANALYTICS_QUEUE_NAME,
      adapter: BullMQAdapter,
    }),
  ],
  providers: [
    AnalyticsWorker,
    AnalyticsEventPublisher,
    ComputeDailyAnalyticsService,
    {
      provide: ANALYTICS_EVENT_PUBLISHER_PORT,
      useExisting: AnalyticsEventPublisher,
    },
  ],
  exports: [
    BullModule,
    ANALYTICS_EVENT_PUBLISHER_PORT,
    AnalyticsEventPublisher,
  ],
})
export class AnalyticsWorkersModule {}
