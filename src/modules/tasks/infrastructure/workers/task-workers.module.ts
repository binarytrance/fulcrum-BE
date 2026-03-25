import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { TaskWorker } from '@tasks/infrastructure/workers/task.worker';
import { TaskEventPublisher } from '@tasks/infrastructure/event-publisher/task-event-publisher';
import { TASKS_QUEUE_NAME } from '@tasks/domain/types/task-jobs.types';
import { TASK_EVENT_PUBLISHER_PORT } from '@tasks/domain/ports/task-event-publisher.port';
import { TaskMongoModule } from '@tasks/infrastructure/persistence/task-mongo.module';
// HabitMongoModule registers HabitOccurrence model used by the MARK_HABIT_OCCURRENCE handler.
import { HabitMongoModule } from '@habits/infrastructure/persistence/habit-mongo.module';
import { AnalyticsWorkersModule } from '@analytics/infrastructure/workers/analytics-workers.module';

@Module({
  imports: [
    TaskMongoModule,
    HabitMongoModule,
    AnalyticsWorkersModule,
    BullModule.registerQueue({ name: TASKS_QUEUE_NAME }),
    BullBoardModule.forFeature({
      name: TASKS_QUEUE_NAME,
      adapter: BullMQAdapter,
    }),
  ],
  providers: [
    TaskWorker,
    TaskEventPublisher,
    { provide: TASK_EVENT_PUBLISHER_PORT, useExisting: TaskEventPublisher },
  ],
  exports: [BullModule, TASK_EVENT_PUBLISHER_PORT],
})
export class TaskWorkersModule {}