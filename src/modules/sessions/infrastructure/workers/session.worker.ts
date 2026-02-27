import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from 'bullmq';
import { Model, Types } from 'mongoose';
import type Redis from 'ioredis';

import { REDIS_CLIENT } from '@shared/infrastructure/redis/redis.provider';
import {
  SessionJobName,
  type UpdateTaskDurationPayload,
  type AbandonStaleJobPayload,
} from '@sessions/domain/types/session-jobs.types';
import {
  SessionDoc,
  type SessionDocument,
} from '@sessions/infrastructure/persistence/session.schema';
import { SessionStatus } from '@sessions/domain/types/session.types';

const timerKey = (sessionId: string) => `session:timer:${sessionId}`;
const activeKey = (userId: string) => `session:active:${userId}`;

@Processor('sessions')
@Injectable()
export class SessionWorker extends WorkerHost {
  private readonly logger = new Logger(SessionWorker.name);

  constructor(
    @InjectModel(SessionDoc.name)
    private readonly sessionModel: Model<SessionDocument>,
    @InjectModel('Task')
    private readonly taskModel: Model<{
      estimatedDuration: number;
      actualDuration: number | null;
    }>,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job ${job.id ?? ''} — ${job.name}`);

    switch (job.name as SessionJobName) {
      case SessionJobName.UPDATE_TASK_DURATION:
        return this.handleUpdateTaskDuration(
          job.data as UpdateTaskDurationPayload,
        );

      case SessionJobName.ABANDON_STALE:
        return this.handleAbandonStale(job.data as AbandonStaleJobPayload);

      default:
        this.logger.warn(`Unknown session job: ${job.name}`);
    }
  }

  private async handleUpdateTaskDuration(
    payload: UpdateTaskDurationPayload,
  ): Promise<void> {
    const { taskId, durationMinutes } = payload;

    // Accumulate total actual duration from all completed sessions for this task
    const result = await this.sessionModel.aggregate<{ total: number }>([
      { $match: { taskId, status: SessionStatus.COMPLETED } },
      { $group: { _id: null, total: { $sum: '$durationMinutes' } } },
    ]);

    const totalMinutes = result[0]?.total ?? durationMinutes;

    await this.taskModel.updateOne(
      { _id: taskId },
      { $set: { actualDuration: totalMinutes, updatedAt: new Date() } },
    );

    this.logger.log(
      `[UpdateTaskDuration] taskId=${taskId} actualDuration=${totalMinutes}min`,
    );
  }

  private async handleAbandonStale(
    payload: AbandonStaleJobPayload,
  ): Promise<void> {
    const { sessionId, userId } = payload;

    const session = await this.sessionModel.findById(sessionId).lean<{
      _id: Types.ObjectId | string;
      status: SessionStatus;
    }>();

    if (!session || session.status !== SessionStatus.ACTIVE) return;

    await this.sessionModel.updateOne(
      { _id: sessionId },
      { $set: { status: SessionStatus.ABANDONED, endedAt: new Date() } },
    );

    await this.redis.del(timerKey(sessionId), activeKey(userId));

    this.logger.log(
      `[AbandonStale] Abandoned session ${sessionId} for user ${userId}`,
    );
  }

  @OnWorkerEvent('ready')
  onReady() {
    this.logger.log('Session worker connected');
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(
      `Job ${job.id ?? ''} (${job.name}) failed: ${err.message}`,
    );
  }
}
