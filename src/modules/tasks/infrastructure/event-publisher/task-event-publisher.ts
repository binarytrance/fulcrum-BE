import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type {
  ITaskEventPublisher,
  TaskEvent,
} from '@tasks/domain/ports/task-event-publisher.port';
import { TaskCompletedEvent } from '@tasks/domain/events/task-completed.event';
import { TaskJobs } from '@tasks/domain/types/task-jobs.types';

export const TASKS_QUEUE_NAME = 'tasks';

@Injectable()
export class TaskEventPublisher implements ITaskEventPublisher {
  private readonly logger = new Logger('TaskEventPublisher');

  constructor(@InjectQueue(TASKS_QUEUE_NAME) private readonly queue: Queue) {}

  async publish(event: TaskEvent): Promise<void> {
    if (event instanceof TaskCompletedEvent) {
      if (event.goalId) {
        this.logger.log(
          `Queuing goal progress recomputation — taskId: ${event.taskId}, goalId: ${event.goalId}`,
        );
        await this.queue.add(
          TaskJobs.RECOMPUTE_GOAL_PROGRESS,
          { taskId: event.taskId, goalId: event.goalId, userId: event.userId },
          {
            jobId: `goal-progress:${event.taskId}`,
            removeOnComplete: { count: 10 },
          },
        );
      }
      // TODO (Phase: Habits) — queue MARK_HABIT_OCCURRENCE if task is linked to a habit
    }
  }
}
