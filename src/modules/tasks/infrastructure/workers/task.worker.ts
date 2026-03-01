import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TASKS_QUEUE_NAME } from '@tasks/infrastructure/event-publisher/task-event-publisher';
import { TaskJobPayloads, TaskJobs } from '@tasks/domain/types/task-jobs.types';
import { OccurrenceStatus } from '@habits/domain/types/habit.types';

// Narrow lean types — avoids unsafe-any lint errors
interface TaskLean {
  _id: string;
  habitId?: string | null;
  actualDuration?: number | null;
  estimatedDuration: number;
}

type TaskJobUnion =
  | Job<TaskJobPayloads[TaskJobs.RECOMPUTE_GOAL_PROGRESS]>
  | Job<TaskJobPayloads[TaskJobs.MARK_HABIT_OCCURRENCE]>;

@Processor(TASKS_QUEUE_NAME)
@Injectable()
export class TaskWorker extends WorkerHost {
  private readonly logger = new Logger(TaskWorker.name);

  constructor(
    @InjectModel('Task') private readonly taskModel: Model<TaskLean>,
    @InjectModel('HabitOccurrence')
    private readonly occurrenceModel: Model<Record<string, unknown>>,
  ) {
    super();
  }

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
        return this.handleMarkHabitOccurrence(taskId, date);
      }

      default:
        this.logger.warn(`Unknown task job: ${job.name}`);
        return Promise.resolve();
    }
  }

  private async handleMarkHabitOccurrence(
    taskId: string,
    date: string,
  ): Promise<void> {
    const task = await this.taskModel.findById(taskId).lean<TaskLean>().exec();
    if (!task?.habitId) return; // task not linked to a habit

    const durationMinutes: number =
      task.actualDuration ?? task.estimatedDuration;

    const result = await this.occurrenceModel
      .findOneAndUpdate(
        {
          habitId: task.habitId,
          date,
          status: OccurrenceStatus.PENDING,
        },
        {
          $set: {
            status: OccurrenceStatus.COMPLETED,
            completedAt: new Date(),
            sessionId: null,
            durationMinutes,
          },
        },
        { new: true },
      )
      .exec();

    if (result) {
      this.logger.log(
        `[HabitOccurrence] Auto-completed occurrence for habit ${task.habitId} on ${date}`,
      );
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
