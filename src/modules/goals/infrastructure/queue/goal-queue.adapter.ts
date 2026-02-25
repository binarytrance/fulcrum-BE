import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type {
  IGoalEventPublisher,
  GoalEvent,
} from '@goals/domain/ports/goal-event-publisher.port';
import { GoalDeadlineChangedEvent } from '@goals/domain/events/goal-deadline-changed.event';
import { GoalProgressRecomputeEvent } from '@goals/domain/events/goal-progress-recompute.event';
import { GoalJobs } from '@goals/domain/types/goal-jobs.types';

export const GOALS_QUEUE_NAME = 'goals';

@Injectable()
export class GoalQueueAdapter implements IGoalEventPublisher {
  private readonly logger = new Logger('GoalEventPublisher');

  constructor(@InjectQueue(GOALS_QUEUE_NAME) private readonly queue: Queue) {}

  async publish(event: GoalEvent): Promise<void> {
    if (event instanceof GoalDeadlineChangedEvent) {
      this.logger.log(
        `Queuing pacing recalculation — goalId: ${event.goalId}, userId: ${event.userId}`,
      );
      await this.queue.add(
        GoalJobs.RECALCULATE_PACING,
        { goalId: event.goalId, userId: event.userId },
        { jobId: `pacing:${event.goalId}`, removeOnComplete: { count: 10 } },
      );
    }

    if (event instanceof GoalProgressRecomputeEvent) {
      this.logger.log(
        `Queuing progress recomputation — goalId: ${event.goalId}, userId: ${event.userId}`,
      );
      await this.queue.add(
        GoalJobs.RECOMPUTE_PROGRESS,
        { goalId: event.goalId, userId: event.userId },
        {
          jobId: `progress:${event.goalId}`,
          removeOnComplete: { count: 10 },
        },
      );
    }
  }
}
