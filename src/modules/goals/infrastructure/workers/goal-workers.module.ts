import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { GoalWorker } from '@goals/infrastructure/workers/goal.worker';
import {
  GoalQueueAdapter,
  GOALS_QUEUE_NAME,
} from '@goals/infrastructure/queue/goal-queue.adapter';
import { GOAL_EVENT_PUBLISHER_PORT } from '@goals/domain/ports/goal-event-publisher.port';

@Module({
  imports: [
    BullModule.registerQueue({ name: GOALS_QUEUE_NAME }),
    BullBoardModule.forFeature({
      name: GOALS_QUEUE_NAME,
      adapter: BullMQAdapter,
    }),
  ],
  providers: [
    GoalWorker,
    GoalQueueAdapter,
    { provide: GOAL_EVENT_PUBLISHER_PORT, useExisting: GoalQueueAdapter },
  ],
  exports: [BullModule, GOAL_EVENT_PUBLISHER_PORT],
})
export class GoalWorkersModule {}
