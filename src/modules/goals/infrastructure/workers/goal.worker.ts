import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GOALS_QUEUE_NAME } from '@goals/domain/types/goal-jobs.types';
import { GoalJobPayloads, GoalJobs } from '@goals/domain/types/goal-jobs.types';

// Narrow lean types — avoids unsafe-any lint errors
interface GoalLean {
  _id: string;
  parentGoalId?: string | null;
}

interface TaskLean {
  _id: string;
}

interface SessionLean {
  duration: number | null;
}

type GoalJobUnion =
  | Job<GoalJobPayloads[GoalJobs.RECALCULATE_PACING]>
  | Job<GoalJobPayloads[GoalJobs.RECOMPUTE_PROGRESS]>;

@Processor(GOALS_QUEUE_NAME)
@Injectable()
export class GoalWorker extends WorkerHost {
  private readonly logger = new Logger(GoalWorker.name);

  constructor(
    @InjectModel('Goal') private readonly goalModel: Model<GoalLean>,
    @InjectModel('Task') private readonly taskModel: Model<TaskLean>,
    @InjectModel('Session')
    private readonly sessionModel: Model<SessionLean>,
  ) {
    super();
  }

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
        return this.recomputeGoalProgress(goalId);
      }

      default:
        this.logger.warn(`Unknown goal job: ${job.name}`);
        return Promise.resolve();
    }
  }

  private async recomputeGoalProgress(goalId: string): Promise<void> {
    // Collect the goal and all ancestors (max 3 levels)
    const goalChain: GoalLean[] = [];
    let currentId: string | null = goalId;
    while (currentId) {
      const goal: GoalLean | null = await this.goalModel
        .findById(currentId)
        .lean<GoalLean>();
      if (!goal) break;
      goalChain.push(goal);
      currentId = goal.parentGoalId ?? null;
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
        { $group: { _id: null, total: { $sum: '$duration' } } },
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
