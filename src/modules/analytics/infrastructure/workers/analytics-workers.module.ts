import { Module, OnModuleInit } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { Queue } from 'bullmq';

import { SharedModule } from '@shared/shared.module';
import { AnalyticsMongoModule } from '@analytics/infrastructure/persistence/analytics-mongo.module';
import { AnalyticsWorker } from '@analytics/infrastructure/workers/analytics.worker';
import {
  AnalyticsEventPublisher,
  ANALYTICS_QUEUE_NAME,
} from '@analytics/infrastructure/event-publisher/analytics-event-publisher';
import { ANALYTICS_EVENT_PUBLISHER_PORT } from '@analytics/domain/ports/analytics-event-publisher.port';

// Cross-module Mongoose models required by AnalyticsWorker
import { SessionMongoModule } from '@sessions/infrastructure/persistence/session-mongo.module';
import { TaskMongoModule } from '@tasks/infrastructure/persistence/task-mongo.module';
import { GoalMongoModule } from '@goals/infrastructure/persistence/goal-mongo.module';

import { AnalyticsJobName } from '@analytics/domain/types/analytics-jobs.types';

@Module({
  imports: [
    SharedModule,
    AnalyticsMongoModule,
    SessionMongoModule,
    TaskMongoModule,
    GoalMongoModule,
    BullModule.registerQueue({ name: ANALYTICS_QUEUE_NAME }),
    BullBoardModule.forFeature({
      name: ANALYTICS_QUEUE_NAME,
      adapter: BullMQAdapter,
    }),
  ],
  providers: [
    AnalyticsWorker,
    AnalyticsEventPublisher,
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
export class AnalyticsWorkersModule implements OnModuleInit {
  constructor(
    @InjectQueue(ANALYTICS_QUEUE_NAME) private readonly queue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    // Run every Sunday at 23:00 UTC — aggregates 7 daily analytics into the week's summary
    await this.queue.add(
      AnalyticsJobName.COMPUTE_WEEKLY_ALL,
      {},
      {
        repeat: { pattern: '0 23 * * 0' },
        jobId: 'analytics.weekly-all.cron',
      },
    );
  }
}
