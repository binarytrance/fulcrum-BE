import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { GoalWorker } from '@goals/infrastructure/workers/goal.worker';
import {
  GoalEventPublisher,
  GOALS_QUEUE_NAME,
} from '@goals/infrastructure/event-publisher/goal-event-publisher';
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
    GoalEventPublisher,
    { provide: GOAL_EVENT_PUBLISHER_PORT, useExisting: GoalEventPublisher },
  ],
  exports: [BullModule, GOAL_EVENT_PUBLISHER_PORT],
})
export class GoalWorkersModule {}
