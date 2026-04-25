import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  TASKS_QUEUE_NAME,
  TaskJobPayloads,
  TaskJobs,
} from '@tasks/domain/types/task-jobs.types';
import { OccurrenceStatus } from '@habits/domain/types/habit.types';

// Narrow lean types — avoids unsafe-any lint errors
interface TaskLean {
  _id: string;
  habitId?: string | null;
  actualDuration?: number | null;
  estimatedDuration: number;
}

interface GoalLean {
  _id: string;
  parentGoalId?: string | null;
  progress: {
    totalTasks: number;
    completedTasks: number;
    totalLoggedMs: number;
    score: number;
    lastComputedAt: Date;
  };
}

interface SessionLean {
  taskId: string;
  durationMs: number | null;
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
    @InjectModel('Goal') private readonly goalModel: Model<GoalLean>,
    @InjectModel('Session')
    private readonly sessionModel: Model<SessionLean>,
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
        return this.recomputeGoalProgress(goalId);
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

  private async recomputeGoalProgress(goalId: string): Promise<void> {
    // Collect the goal and all ancestors (max 3 levels)
    const goalChain: GoalLean[] = [];
    let currentId: string | null = goalId;
    while (currentId) {
      const found = (await this.goalModel
        .findById(currentId)
        .lean()) as GoalLean | null;
      if (!found) break;
      goalChain.push(found);
      currentId = found.parentGoalId ?? null;
    }

    // Recompute each goal in the chain (deepest first, then ancestors)
    for (const goal of goalChain) {
      await this.recomputeSingleGoal(goal._id.toString());
    }
  }

  private async recomputeSingleGoal(goalId: string): Promise<void> {
    // 1. Count tasks for this goal
    const totalTasks = await this.taskModel.countDocuments({
      goalId,
      deletedAt: null,
    });
    const completedTasks = await this.taskModel.countDocuments({
      goalId,
      deletedAt: null,
      status: 'COMPLETED',
    });

    // 2. Get all task IDs for this goal to aggregate sessions
    const taskDocs = await this.taskModel
      .find({ goalId, deletedAt: null }, { _id: 1 })
      .lean<{ _id: string }[]>();
    const taskIds = taskDocs.map((t) => t._id.toString());

    // 3. Aggregate total session duration in ms
    let totalLoggedMs = 0;
    if (taskIds.length > 0) {
      const result = await this.sessionModel.aggregate<{ total: number }>([
        { $match: { taskId: { $in: taskIds }, status: 'COMPLETED' } },
        { $group: { _id: null, total: { $sum: '$durationMs' } } },
      ]);
      totalLoggedMs = result[0]?.total ?? 0;
    }

    // 4. Compute score
    const score = Math.round((completedTasks / Math.max(totalTasks, 1)) * 100);

    // 5. Write back
    await this.goalModel.updateOne(
      { _id: goalId },
      {
        $set: {
          'progress.totalTasks': totalTasks,
          'progress.completedTasks': completedTasks,
          'progress.totalLoggedMs': totalLoggedMs,
          'progress.score': score,
          'progress.lastComputedAt': new Date(),
          updatedAt: new Date(),
        },
      },
    );

    this.logger.log(
      `[GoalProgress] goal=${goalId} totalTasks=${totalTasks} completed=${completedTasks} score=${score} loggedMs=${totalLoggedMs}`,
    );
  }

  private async handleMarkHabitOccurrence(
    taskId: string,
    date: string,
  ): Promise<void> {
    const task = await this.taskModel.findById(taskId).lean<TaskLean>().exec();
    if (!task?.habitId) return; // task not linked to a habit

    const durationMs: number = task.actualDuration ?? task.estimatedDuration;
    const durationMinutes: number = Math.round(durationMs / 60000);

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
