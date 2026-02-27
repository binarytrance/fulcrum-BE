import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { TASKS_QUEUE_NAME } from '@tasks/infrastructure/event-publisher/task-event-publisher';
import { TaskJobPayloads, TaskJobs } from '@tasks/domain/types/task-jobs.types';

type TaskJobUnion =
  | Job<TaskJobPayloads[TaskJobs.RECOMPUTE_GOAL_PROGRESS]>
  | Job<TaskJobPayloads[TaskJobs.MARK_HABIT_OCCURRENCE]>;

@Processor(TASKS_QUEUE_NAME)
@Injectable()
export class TaskWorker extends WorkerHost {
  private readonly logger = new Logger(TaskWorker.name);

  process(job: TaskJobUnion): Promise<void> {
    this.logger.log(`Processing job ${job.id} — ${job.name}`);

    switch (job.name as TaskJobs) {
      case TaskJobs.RECOMPUTE_GOAL_PROGRESS: {
        const { taskId, goalId, userId } =
          job.data as TaskJobPayloads[TaskJobs.RECOMPUTE_GOAL_PROGRESS];
        this.logger.log(
          `[GoalProgress] Recomputing progress for goal ${goalId} after task ${taskId} completed (user ${userId})`,
        );
        // TODO (Phase Sessions): aggregate session + task data and write back to goal.progress
        return Promise.resolve();
      }

      case TaskJobs.MARK_HABIT_OCCURRENCE: {
        const { taskId, userId, date } =
          job.data as TaskJobPayloads[TaskJobs.MARK_HABIT_OCCURRENCE];
        this.logger.log(
          `[HabitOccurrence] Marking habit occurrence for task ${taskId} on ${date} (user ${userId})`,
        );
        // TODO (Phase Habits): call habit occurrence service
        return Promise.resolve();
      }

      default:
        this.logger.warn(`Unknown task job: ${job.name}`);
        return Promise.resolve();
    }
  }

  @OnWorkerEvent('ready')
  onReady() {
    this.logger.log('Task worker connected');
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
