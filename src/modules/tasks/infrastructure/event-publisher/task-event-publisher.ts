import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type {
  ITaskEventPublisher,
  TaskEvent,
} from '@tasks/domain/ports/task-event-publisher.port';
import { TaskCompletedEvent } from '@tasks/domain/events/task-completed.event';
import {
  TaskJobs,
  TASKS_QUEUE_NAME,
} from '@tasks/domain/types/task-jobs.types';
import {
  ANALYTICS_EVENT_PUBLISHER_PORT,
  type IAnalyticsEventPublisher,
} from '@analytics/domain/ports/analytics-event-publisher.port';

@Injectable()
export class TaskEventPublisher implements ITaskEventPublisher {
  private readonly logger = new Logger('TaskEventPublisher');

  constructor(
    @InjectQueue(TASKS_QUEUE_NAME) private readonly queue: Queue,
    @Inject(ANALYTICS_EVENT_PUBLISHER_PORT)
    private readonly analyticsEventPublisher: IAnalyticsEventPublisher,
  ) {}

  async publish(event: TaskEvent): Promise<void> {
    if (event instanceof TaskCompletedEvent) {
      const date = new Date().toISOString().slice(0, 10);

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

      // (Phase 5: Habits) — queue MARK_HABIT_OCCURRENCE if task is linked to a habit
      if (event.habitId) {
        await this.queue.add(
          TaskJobs.MARK_HABIT_OCCURRENCE,
          { taskId: event.taskId, userId: event.userId, date },
          {
            jobId: `habit-occurrence_${event.taskId}_${date}`,
            removeOnComplete: { count: 10 },
          },
        );
      }

      // (Phase 6: Analytics) — queue daily analytics recompute + estimation profile update
      await Promise.all([
        this.analyticsEventPublisher.queueDailyCompute(event.userId, date),
        this.analyticsEventPublisher.queueGoalCompute(
          event.userId,
          event.taskId,
        ),
        this.analyticsEventPublisher.queueEstimationUpdate(
          event.userId,
          event.taskId,
        ),
      ]);
    }
  }
}
