import { Inject, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { ISessionEventPublisher } from '@sessions/domain/ports/session-event-publisher.port';
import type { SessionCompletedEvent } from '@sessions/domain/events/session-completed.event';
import {
  SessionJobName,
  SESSIONS_QUEUE_NAME,
  type UpdateTaskDurationPayload,
} from '@sessions/domain/types/session-jobs.types';
import {
  ANALYTICS_EVENT_PUBLISHER_PORT,
  type IAnalyticsEventPublisher,
} from '@analytics/domain/ports/analytics-event-publisher.port';

@Injectable()
export class SessionEventPublisher implements ISessionEventPublisher {
  constructor(
    @InjectQueue(SESSIONS_QUEUE_NAME) private readonly sessionQueue: Queue,
    @Inject(ANALYTICS_EVENT_PUBLISHER_PORT)
    private readonly analyticsEventPublisher: IAnalyticsEventPublisher,
  ) {}

  async publishSessionCompleted(event: SessionCompletedEvent): Promise<void> {
    const payload: UpdateTaskDurationPayload = {
      taskId: event.taskId,
      durationMinutes: event.durationMinutes,
    };

    const date = new Date().toISOString().slice(0, 10);

    await Promise.all([
      // Update task's actualDuration in the sessions queue
      this.sessionQueue.add(SessionJobName.UPDATE_TASK_DURATION, payload, {
        jobId: `${SessionJobName.UPDATE_TASK_DURATION}_${event.sessionId}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      }),

      // Recompute daily analytics for today
      this.analyticsEventPublisher.queueDailyCompute(event.userId, date),

      // Recompute goal analytics for the goal this task belongs to
      this.analyticsEventPublisher.queueGoalCompute(event.userId, event.taskId),
    ]);
  }
}