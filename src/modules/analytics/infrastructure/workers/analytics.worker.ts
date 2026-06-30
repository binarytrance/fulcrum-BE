import {
  ComputeDailyAnalyticsService,
  type SessionData,
  type TaskData,
  type OccurrenceData,
} from '@analytics/application/services/compute-daily-analytics.service';
import { ComputeGoalAnalyticsService } from '@analytics/application/services/compute-goal-analytics.service';
import { ComputeEstimationProfileService } from '@analytics/application/services/compute-estimation-profile.service';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from 'bullmq';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';

import {
  AnalyticsJobName,
  type AnalyticsJobPayloads,
} from '@analytics/domain/types/analytics-jobs.types';
import {
  DailyAnalyticsDoc,
  type DailyAnalyticsDocument,
} from '@analytics/infrastructure/persistence/daily-analytics.schema';
import {
  GoalAnalyticsDoc,
  type GoalAnalyticsDocument,
} from '@analytics/infrastructure/persistence/goal-analytics.schema';
import {
  EstimationProfileDoc,
  type EstimationProfileDocument,
} from '@analytics/infrastructure/persistence/estimation-profile.schema';
import {
  SessionDoc,
  type SessionDocument,
} from '@focus-sessions/infrastructure/persistence/session.schema';
import type { AccuracyEntry } from '@analytics/domain/types/analytics.types';
import { ANALYTICS_QUEUE_NAME } from '@analytics/infrastructure/event-publisher/analytics-event-publisher';

// ─── Lean Types from cross-module models ─────────────────────────────────────

interface SessionLean {
  _id: string;
  userId: string;
  taskId: string;
  status: string;
  duration: number | null;
  netFocus: number | null;
  distractions: { estimated: number }[];
  plantStatus: string;
  startedAt: Date;
  endedAt: Date | null;
}

interface TaskLean {
  _id: string;
  userId: string;
  goalId: string | null;
  type: string;
  status: string;
  scheduledFor: Date | null;
  estimatedDuration: number;
  actualDuration: number | null;
  efficiencyScore: number | null;
  completedAt: Date | null;
  deletedAt: Date | null;
}

interface GoalLean {
  _id: string;
  title: string;
  estimatedEndDate: Date | null;
  estimatedDuration: number | null;
}

interface HabitOccurrenceLean {
  userId: string;
  date: string;
  status: 'pending' | 'completed' | 'missed' | 'skipped';
}

// ─── Worker ───────────────────────────────────────────────────────────────────

@Processor(ANALYTICS_QUEUE_NAME)
@Injectable()
export class AnalyticsWorker extends WorkerHost {
  private readonly logger = new Logger(AnalyticsWorker.name);

  constructor(
    @InjectModel(DailyAnalyticsDoc.name)
    private readonly dailyModel: Model<DailyAnalyticsDocument>,

    @InjectModel(GoalAnalyticsDoc.name)
    private readonly goalAnalyticsModel: Model<GoalAnalyticsDocument>,

    @InjectModel(EstimationProfileDoc.name)
    private readonly estimationModel: Model<EstimationProfileDocument>,

    @InjectModel(SessionDoc.name)
    private readonly sessionModel: Model<SessionDocument>,

    @InjectModel('Task')
    private readonly taskModel: Model<TaskLean>,

    @InjectModel('Goal')
    private readonly goalModel: Model<GoalLean>,

    @InjectModel('HabitOccurrence')
    private readonly habitOccurrenceModel: Model<HabitOccurrenceLean>,

    private readonly computeDailyService: ComputeDailyAnalyticsService,
    private readonly computeGoalService: ComputeGoalAnalyticsService,
    private readonly computeEstimationService: ComputeEstimationProfileService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job ${job.id ?? ''} — ${job.name}`);

    switch (job.name as AnalyticsJobName) {
      case AnalyticsJobName.COMPUTE_DAILY:
        return this.handleComputeDaily(
          job.data as AnalyticsJobPayloads[AnalyticsJobName.COMPUTE_DAILY],
        );

      case AnalyticsJobName.COMPUTE_GOAL:
        return this.handleComputeGoal(
          job.data as AnalyticsJobPayloads[AnalyticsJobName.COMPUTE_GOAL],
        );

      case AnalyticsJobName.INIT_GOAL:
        return this.handleInitGoal(
          job.data as AnalyticsJobPayloads[AnalyticsJobName.INIT_GOAL],
        );

      case AnalyticsJobName.UPDATE_ESTIMATION:
        return this.handleUpdateEstimation(
          job.data as AnalyticsJobPayloads[AnalyticsJobName.UPDATE_ESTIMATION],
        );

      default:
        this.logger.warn(`Unknown analytics job: ${job.name}`);
    }
  }

  // ─── COMPUTE_DAILY ──────────────────────────────────────────────────────────

  private async handleComputeDaily(
    payload: AnalyticsJobPayloads[AnalyticsJobName.COMPUTE_DAILY],
  ): Promise<void> {
    const { userId, date } = payload;
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    // ── 1. Fetch raw data (infrastructure concern) ────────────────────────────
    const [sessions, tasks, occurrences] = await Promise.all([
      this.sessionModel
        .find({
          userId,
          status: 'COMPLETED',
          startedAt: { $gte: dayStart, $lte: dayEnd },
        })
        .lean<SessionData[]>(),

      this.taskModel
        .find({
          userId,
          deletedAt: null,
          $or: [
            { scheduledFor: { $gte: dayStart, $lte: dayEnd } },
            { completedAt: { $gte: dayStart, $lte: dayEnd } },
          ],
        })
        .lean<(TaskData & { _id: string })[]>()
        .then((docs) => {
          // Deduplicate (MongoDB $or won't return duplicates, but be explicit)
          const seen = new Set<string>();
          return docs.filter((t) => {
            if (seen.has(t._id)) return false;
            seen.add(t._id);
            return true;
          });
        }),

      this.habitOccurrenceModel.find({ userId, date }).lean<OccurrenceData[]>(),
    ]);

    // ── 2. Compute metrics (application service — pure business logic) ─────────
    const computed = this.computeDailyService.compute(
      sessions,
      tasks,
      occurrences,
    );

    // ── 3. Persist result (infrastructure concern) ────────────────────────────
    await this.dailyModel.findOneAndUpdate(
      { userId, date },
      {
        $set: {
          userId,
          date,
          ...computed,
          computedAt: new Date(),
        },
        $setOnInsert: { _id: randomUUID() },
      },
      { upsert: true },
    );

    this.logger.log(
      `[Daily] userId=${userId} date=${date} — ${computed.totalLoggedMinutes}min logged, habits=${computed.completedHabitCount}/${computed.totalHabitCount}, ${computed.timeLeaks.length} time leaks`,
    );
  }

  // ─── COMPUTE_GOAL ───────────────────────────────────────────────────────────

  private async handleComputeGoal(
    payload: AnalyticsJobPayloads[AnalyticsJobName.COMPUTE_GOAL],
  ): Promise<void> {
    const { userId, taskId } = payload;

    // ── 1. Resolve goalId from the trigger task ───────────────────────────────
    const triggerTask = await this.taskModel
      .findById(taskId)
      .lean<{ goalId: string | null }>();
    const goalId = triggerTask?.goalId;
    if (!goalId) return;

    const goal = await this.goalModel.findById(goalId).lean<GoalLean>();
    if (!goal) return;

    // ── 2. Fetch raw data (infrastructure concern) ────────────────────────────
    const tasks = await this.taskModel
      .find({ goalId, deletedAt: null })
      .lean<TaskLean[]>();

    const taskIds = tasks.map((t) => t._id);
    const sessions = await this.sessionModel
      .find({ taskId: { $in: taskIds }, status: 'COMPLETED' })
      .lean<SessionLean[]>();

    // ── 3. Compute metrics (application service — pure business logic) ─────────
    const computed = this.computeGoalService.compute(goal, tasks, sessions);

    // ── 4. Persist result (infrastructure concern) ────────────────────────────
    await this.goalAnalyticsModel.findOneAndUpdate(
      { goalId },
      {
        $set: {
          goalId,
          userId,
          ...computed,
          lastComputedAt: new Date(),
        },
        $setOnInsert: { _id: randomUUID() },
      },
      { upsert: true },
    );

    this.logger.log(
      `[Goal] goalId=${goalId} — ${computed.totalLoggedMinutes}min logged, ${computed.consistencyScore}% consistent, onTrack=${String(computed.isOnTrack)}`,
    );
  }

  // ─── INIT_GOAL ────────────────────────────────────────────────────────────────

  private async handleInitGoal(
    payload: AnalyticsJobPayloads[AnalyticsJobName.INIT_GOAL],
  ): Promise<void> {
    const { userId, goalId, goalTitle } = payload;

    // Uses $setOnInsert only — if a doc already exists (COMPUTE_GOAL ran first)
    // this is a no-op, so we never overwrite real computed data.
    const existing = await this.goalAnalyticsModel.findOneAndUpdate(
      { goalId },
      {
        $setOnInsert: {
          _id: randomUUID(),
          goalId,
          userId,
          goalTitle,
          totalLoggedMinutes: 0,
          taskCount: 0,
          completedTaskCount: 0,
          completionPercent: 0,
          avgEfficiencyScore: null,
          consistencyScore: 0,
          weeklyAvgMinutes: 0,
          projectedCompletionDate: null,
          isOnTrack: null,
          lastComputedAt: new Date(),
        },
      },
      { upsert: true, new: false },
    );

    if (!existing) {
      this.logger.log(`[GoalInit] goalId=${goalId} — initialized with zeros`);
    } else {
      this.logger.log(`[GoalInit] goalId=${goalId} — already exists, skipped`);
    }
  }

  // ─── UPDATE_ESTIMATION ──────────────────────────────────────────────────────

  private async handleUpdateEstimation(
    payload: AnalyticsJobPayloads[AnalyticsJobName.UPDATE_ESTIMATION],
  ): Promise<void> {
    const { userId, taskId } = payload;

    // ── 1. Fetch task data (infrastructure concern) ───────────────────────────
    const task = await this.taskModel.findById(taskId).lean<{
      estimatedDuration: number;
      actualDuration: number | null;
      efficiencyScore: number | null;
      completedAt: Date | null;
    }>();

    if (!task?.actualDuration || task.efficiencyScore == null) return;

    // ── 2. Fetch existing profile (infrastructure concern) ────────────────────
    const existing = await this.estimationModel
      .findOne({ userId })
      .lean<{ recentAccuracies: AccuracyEntry[] }>();

    // ── 3. Compute updated profile (application service — pure business logic) ─
    const computed = this.computeEstimationService.compute(
      {
        taskId,
        date: task.completedAt ?? new Date(),
        estimated: task.estimatedDuration,
        actual: task.actualDuration,
        accuracy: task.efficiencyScore,
      },
      existing?.recentAccuracies ?? [],
    );

    // ── 4. Persist result (infrastructure concern) ────────────────────────────
    await this.estimationModel.findOneAndUpdate(
      { userId },
      {
        $set: {
          userId,
          ...computed,
          updatedAt: new Date(),
        },
        $setOnInsert: { _id: randomUUID() },
      },
      { upsert: true },
    );

    this.logger.log(
      `[Estimation] userId=${userId} rolling avg=${String(computed.rollingAverage)} trend=${computed.trend}`,
    );
  }

  // ─── Worker Events ───────────────────────────────────────────────────────────

  @OnWorkerEvent('ready')
  onReady() {
    this.logger.log('Analytics worker connected');
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job completed: ${job.id ?? ''} — ${job.name}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(
      `Job ${job.id ?? ''} (${job.name}) failed: ${err.message}`,
    );
  }
}
