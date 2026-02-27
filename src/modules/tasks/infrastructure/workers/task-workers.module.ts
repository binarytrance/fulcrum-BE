import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { TaskWorker } from '@tasks/infrastructure/workers/task.worker';
import {
  TaskEventPublisher,
  TASKS_QUEUE_NAME,
} from '@tasks/infrastructure/event-publisher/task-event-publisher';
import { TASK_EVENT_PUBLISHER_PORT } from '@tasks/domain/ports/task-event-publisher.port';

@Module({
  imports: [
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
