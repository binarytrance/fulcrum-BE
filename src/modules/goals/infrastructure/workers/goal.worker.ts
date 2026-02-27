import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { GOALS_QUEUE_NAME } from '@goals/infrastructure/event-publisher/goal-event-publisher';
import { GoalJobPayloads, GoalJobs } from '@goals/domain/types/goal-jobs.types';

type GoalJobUnion =
  | Job<GoalJobPayloads[GoalJobs.RECALCULATE_PACING]>
  | Job<GoalJobPayloads[GoalJobs.RECOMPUTE_PROGRESS]>;

@Processor(GOALS_QUEUE_NAME)
@Injectable()
export class GoalWorker extends WorkerHost {
  private readonly logger = new Logger(GoalWorker.name);

  process(job: GoalJobUnion): Promise<void> {
    this.logger.log(`Processing job ${job.id} — ${job.name}`);

    switch (job.name as GoalJobs) {
      case GoalJobs.RECALCULATE_PACING: {
        const { goalId, userId } =
          job.data as GoalJobPayloads[GoalJobs.RECALCULATE_PACING];
        this.logger.log(
          `[Pacing] Recalculating pacing for goal ${goalId} (user ${userId})`,
        );
        // TODO (Phase AI): call AI pacing advisor service here
        return Promise.resolve();
      }

      case GoalJobs.RECOMPUTE_PROGRESS: {
        const { goalId, userId } =
          job.data as GoalJobPayloads[GoalJobs.RECOMPUTE_PROGRESS];
        this.logger.log(
          `[Progress] Recomputing progress for goal ${goalId} (user ${userId})`,
        );
        // TODO (Phase Tasks/Sessions): aggregate session data and write back to goal
        return Promise.resolve();
      }

      default:
        this.logger.warn(`Unknown goal job: ${job.name}`);
        return Promise.resolve();
    }
  }

  @OnWorkerEvent('ready')
  onReady() {
    this.logger.log('Goal worker connected');
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job completed: ${job.id} — ${job.name}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job) {
    this.logger.error(`Job failed: ${job.id} — ${job.name}`, job.failedReason);
  }
}
