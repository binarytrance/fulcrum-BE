import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { SessionWorker } from '@sessions/infrastructure/workers/session.worker';
import { SessionEventPublisher } from '@sessions/infrastructure/event-publisher/session-event-publisher';
import { SESSION_EVENT_PUBLISHER_PORT } from '@sessions/domain/ports/session-event-publisher.port';
import { SESSIONS_QUEUE_NAME } from '@sessions/domain/types/session-jobs.types';
import { SharedModule } from '@shared/shared.module';
import { SessionMongoModule } from '@sessions/infrastructure/persistence/session-mongo.module';
// TaskMongoModule registers the 'Task' Mongoose model needed by SessionWorker.
import { TaskMongoModule } from '@tasks/infrastructure/persistence/task-mongo.module';
import { AnalyticsWorkersModule } from '@analytics/infrastructure/workers/analytics-workers.module';

@Module({
  imports: [
    SharedModule,
    SessionMongoModule,
    TaskMongoModule,
    AnalyticsWorkersModule,
    BullModule.registerQueue({ name: SESSIONS_QUEUE_NAME }),
    BullBoardModule.forFeature({
      name: SESSIONS_QUEUE_NAME,
      adapter: BullMQAdapter,
    }),
  ],
  providers: [
    SessionWorker,
    SessionEventPublisher,
    { provide: SESSION_EVENT_PUBLISHER_PORT, useExisting: SessionEventPublisher },
  ],
  exports: [BullModule, SESSION_EVENT_PUBLISHER_PORT],
})
export class SessionWorkersModule {}