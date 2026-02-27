import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { ISessionEventPublisher } from '@sessions/domain/ports/session-event-publisher.port';
import type { SessionCompletedEvent } from '@sessions/domain/events/session-completed.event';
import {
  SessionJobName,
  type UpdateTaskDurationPayload,
} from '@sessions/domain/types/session-jobs.types';

@Injectable()
export class SessionEventPublisher implements ISessionEventPublisher {
  constructor(@InjectQueue('sessions') private readonly sessionQueue: Queue) {}

  async publishSessionCompleted(event: SessionCompletedEvent): Promise<void> {
    const payload: UpdateTaskDurationPayload = {
      taskId: event.taskId,
      durationMinutes: event.durationMinutes,
    };

    await this.sessionQueue.add(SessionJobName.UPDATE_TASK_DURATION, payload, {
      jobId: `${SessionJobName.UPDATE_TASK_DURATION}_${event.sessionId}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
  }
}
