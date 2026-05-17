import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { GoalWorker } from '@goals/infrastructure/workers/goal.worker';
import { GoalEventPublisher } from '@goals/infrastructure/event-publisher/goal-event-publisher';
import { GOALS_QUEUE_NAME } from '@goals/domain/types/goal-jobs.types';
import { GOAL_EVENT_PUBLISHER_PORT } from '@goals/domain/ports/goal-event-publisher.port';
import { GoalMongoModule } from '@goals/infrastructure/persistence/goal-mongo.module';
import { TaskMongoModule } from '@tasks/infrastructure/persistence/task-mongo.module';
import { SessionMongoModule } from '@focus-sessions/infrastructure/persistence/session-mongo.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: GOALS_QUEUE_NAME }),
    BullBoardModule.forFeature({
      name: GOALS_QUEUE_NAME,
      adapter: BullMQAdapter,
    }),
    GoalMongoModule,
    TaskMongoModule,
    SessionMongoModule,
  ],
  providers: [
    GoalWorker,
    GoalEventPublisher,
    { provide: GOAL_EVENT_PUBLISHER_PORT, useExisting: GoalEventPublisher },
  ],
  exports: [BullModule, GOAL_EVENT_PUBLISHER_PORT],
})
export class GoalWorkersModule {}
