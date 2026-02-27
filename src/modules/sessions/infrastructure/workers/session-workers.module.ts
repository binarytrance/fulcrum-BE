import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { SessionWorker } from '@sessions/infrastructure/workers/session.worker';
import { SharedModule } from '@shared/shared.module';
import { SessionMongoModule } from '@sessions/infrastructure/persistence/session-mongo.module';
// TaskMongoModule registers the 'Task' Mongoose model needed by SessionWorker.
// This is the only cross-module infrastructure dependency here.
import { TaskMongoModule } from '@tasks/infrastructure/persistence/task-mongo.module';

export const SESSIONS_QUEUE_NAME = 'sessions';

@Module({
  imports: [
    SharedModule,
    SessionMongoModule,
    TaskMongoModule,
    BullModule.registerQueue({ name: SESSIONS_QUEUE_NAME }),
    BullBoardModule.forFeature({
      name: SESSIONS_QUEUE_NAME,
      adapter: BullMQAdapter,
    }),
  ],
  providers: [SessionWorker],
  exports: [BullModule],
})
export class SessionWorkersModule {}
