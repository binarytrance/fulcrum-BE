import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
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
  WeeklyAnalyticsDoc,
  type WeeklyAnalyticsDocument,
} from '@analytics/infrastructure/persistence/weekly-analytics.schema';
import {
  EstimationProfileDoc,
  type EstimationProfileDocument,
} from '@analytics/infrastructure/persistence/estimation-profile.schema';
import {
  SessionDoc,
  type SessionDocument,
} from '@sessions/infrastructure/persistence/session.schema';
import type {
  TimeLeak,
  AccuracyEntry,
  EstimationTrend,
} from '@analytics/domain/types/analytics.types';
import { ANALYTICS_QUEUE_NAME } from '@analytics/infrastructure/event-publisher/analytics-event-publisher';

// ─── Lean Types from cross-module models ─────────────────────────────────────

interface SessionLean {
  _id: string;
  userId: string;
  taskId: string;
  status: string;
  durationMinutes: number | null;
  netFocusMinutes: number | null;
  distractions: { estimatedMinutes: number }[];
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
  deadline: Date | null;
  estimatedHours: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the YYYY-MM-DD string of the Monday starting the ISO week that contains `date`. */
function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0 = Sunday
  const daysFromMonday = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - daysFromMonday);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function formatDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function padTime(n: number): string {
  return String(n).padStart(2, '0');
}

function toHHMM(date: Date): string {
  return `${padTime(date.getUTCHours())}:${padTime(date.getUTCMinutes())}`;
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

    @InjectModel(WeeklyAnalyticsDoc.name)
    private readonly weeklyModel: Model<WeeklyAnalyticsDocument>,

    @InjectModel(EstimationProfileDoc.name)
    private readonly estimationModel: Model<EstimationProfileDocument>,

    @InjectModel(SessionDoc.name)
    private readonly sessionModel: Model<SessionDocument>,

    @InjectModel('Task')
    private readonly taskModel: Model<TaskLean>,

    @InjectModel('Goal')
    private readonly goalModel: Model<GoalLean>,

    @InjectQueue(ANALYTICS_QUEUE_NAME)
    private readonly analyticsQueue: Queue,
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

      case AnalyticsJobName.COMPUTE_WEEKLY:
        return this.handleComputeWeekly(
          job.data as AnalyticsJobPayloads[AnalyticsJobName.COMPUTE_WEEKLY],
        );

      case AnalyticsJobName.UPDATE_ESTIMATION:
        return this.handleUpdateEstimation(
          job.data as AnalyticsJobPayloads[AnalyticsJobName.UPDATE_ESTIMATION],
        );

      case AnalyticsJobName.COMPUTE_WEEKLY_ALL:
        return this.handleComputeWeeklyAll();

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

    // ── Sessions ──
    const sessions = await this.sessionModel
      .find({
        userId,
        status: 'COMPLETED',
        startedAt: { $gte: dayStart, $lte: dayEnd },
      })
      .lean<SessionLean[]>();

    const sessionCount = sessions.length;
    const totalLoggedMinutes = sessions.reduce(
      (s, sess) => s + (sess.durationMinutes ?? 0),
      0,
    );
    const netFocusMinutes = sessions.reduce(
      (s, sess) => s + (sess.netFocusMinutes ?? 0),
      0,
    );
    const deepWorkMinutes = sessions
      .filter((sess) => sess.plantStatus === 'HEALTHY')
      .reduce((s, sess) => s + (sess.durationMinutes ?? 0), 0);
    const shallowWorkMinutes = totalLoggedMinutes - deepWorkMinutes;

    const allDistractions = sessions.flatMap((sess) => sess.distractions ?? []);
    const totalDistractions = allDistractions.length;
    const totalDistractionMinutes = allDistractions.reduce(
      (s, d) => s + d.estimatedMinutes,
      0,
    );
    const avgDistractionPerSession =
      sessionCount > 0
        ? Math.round((totalDistractions / sessionCount) * 10) / 10
        : 0;

    // ── Tasks ──
    const tasks = await this.taskModel
      .find({
        userId,
        deletedAt: null,
        scheduledFor: { $gte: dayStart, $lte: dayEnd },
      })
      .lean<TaskLean[]>();

    const totalTaskCount = tasks.length;
    const plannedTaskCount = tasks.filter((t) => t.type === 'PLANNED').length;
    const unplannedTaskCount = tasks.filter(
      (t) => t.type === 'UNPLANNED',
    ).length;
    const completedTaskCount = tasks.filter(
      (t) => t.status === 'COMPLETED',
    ).length;
    const unplannedPercent =
      totalTaskCount > 0
        ? Math.round((unplannedTaskCount / totalTaskCount) * 100)
        : 0;
    const taskCompletionRate =
      totalTaskCount > 0
        ? Math.round((completedTaskCount / totalTaskCount) * 100)
        : 0;

    const tasksWithScore = tasks.filter(
      (t) => t.efficiencyScore !== null && t.efficiencyScore !== undefined,
    );
    const avgEfficiencyScore =
      tasksWithScore.length > 0
        ? Math.round(
            tasksWithScore.reduce((s, t) => s + (t.efficiencyScore ?? 0), 0) /
              tasksWithScore.length,
          )
        : null;

    // ── Time leaks: gaps > 30 min between consecutive sessions ──
    const sortedSessions = [...sessions].sort(
      (a, b) =>
        new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
    );
    const timeLeaks: TimeLeak[] = [];
    for (let i = 0; i < sortedSessions.length - 1; i++) {
      const endedAt = new Date(sortedSessions[i].endedAt!);
      const nextStart = new Date(sortedSessions[i + 1].startedAt);
      const gapMinutes = Math.round(
        (nextStart.getTime() - endedAt.getTime()) / 60_000,
      );
      if (gapMinutes > 30) {
        timeLeaks.push({
          startTime: toHHMM(endedAt),
          endTime: toHHMM(nextStart),
          gapMinutes,
        });
      }
    }

    // ── Upsert ──
    await this.dailyModel.findOneAndUpdate(
      { userId, date },
      {
        $set: {
          userId,
          date,
          totalLoggedMinutes,
          netFocusMinutes,
          deepWorkMinutes,
          shallowWorkMinutes,
          sessionCount,
          totalDistractions,
          totalDistractionMinutes,
          avgDistractionPerSession,
          totalTaskCount,
          plannedTaskCount,
          unplannedTaskCount,
          completedTaskCount,
          unplannedPercent,
          taskCompletionRate,
          avgEfficiencyScore,
          timeLeaks,
          computedAt: new Date(),
        },
        $setOnInsert: { _id: randomUUID() },
      },
      { upsert: true },
    );

    this.logger.log(
      `[Daily] userId=${userId} date=${date} — ${totalLoggedMinutes}min logged, ${timeLeaks.length} time leaks`,
    );
  }

  // ─── COMPUTE_GOAL ───────────────────────────────────────────────────────────

  private async handleComputeGoal(
    payload: AnalyticsJobPayloads[AnalyticsJobName.COMPUTE_GOAL],
  ): Promise<void> {
    const { userId, taskId } = payload;

    const triggerTask = await this.taskModel
      .findById(taskId)
      .lean<{ goalId: string | null }>();
    const goalId = triggerTask?.goalId;
    if (!goalId) return;

    const goal = await this.goalModel.findById(goalId).lean<GoalLean>();
    if (!goal) return;

    // ── All non-deleted tasks under this goal ──
    const tasks = await this.taskModel
      .find({ goalId, deletedAt: null })
      .lean<TaskLean[]>();

    const taskCount = tasks.length;
    const completedTaskCount = tasks.filter(
      (t) => t.status === 'COMPLETED',
    ).length;
    const completionPercent =
      taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 0;

    const tasksWithScore = tasks.filter((t) => t.efficiencyScore != null);
    const avgEfficiencyScore =
      tasksWithScore.length > 0
        ? Math.round(
            tasksWithScore.reduce((s, t) => s + (t.efficiencyScore ?? 0), 0) /
              tasksWithScore.length,
          )
        : null;

    // ── All sessions for tasks under this goal ──
    const taskIds = tasks.map((t) => t._id);
    const sessions = await this.sessionModel
      .find({ taskId: { $in: taskIds }, status: 'COMPLETED' })
      .lean<SessionLean[]>();

    const totalLoggedMinutes = sessions.reduce(
      (s, sess) => s + (sess.durationMinutes ?? 0),
      0,
    );

    // ── Consistency: % of last 12 weeks that had ≥1 session ──
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setUTCDate(twelveWeeksAgo.getUTCDate() - 84);
    const recentSessions = sessions.filter(
      (s) => new Date(s.startedAt) >= twelveWeeksAgo,
    );
    const activeWeekKeys = new Set(
      recentSessions.map((s) => getWeekStart(new Date(s.startedAt))),
    );
    const consistencyScore = Math.round((activeWeekKeys.size / 12) * 100);
    const weeksActive = Math.max(activeWeekKeys.size, 1);
    const weeklyAvgMinutes = Math.round(totalLoggedMinutes / weeksActive);

    // ── Pacing ──
    let projectedCompletionDate: Date | null = null;
    let isOnTrack: boolean | null = null;
    const estimatedMinutes = (goal.estimatedHours ?? 0) * 60;
    if (estimatedMinutes > 0 && weeklyAvgMinutes > 0) {
      const remaining = Math.max(0, estimatedMinutes - totalLoggedMinutes);
      const weeksNeeded = remaining / weeklyAvgMinutes;
      const projected = new Date();
      projected.setUTCDate(
        projected.getUTCDate() + Math.round(weeksNeeded * 7),
      );
      projectedCompletionDate = projected;
      if (goal.deadline) {
        isOnTrack = projected <= goal.deadline;
      }
    }

    await this.goalAnalyticsModel.findOneAndUpdate(
      { goalId },
      {
        $set: {
          goalId,
          userId,
          goalTitle: goal.title,
          totalLoggedMinutes,
          taskCount,
          completedTaskCount,
          completionPercent,
          avgEfficiencyScore,
          consistencyScore,
          weeklyAvgMinutes,
          projectedCompletionDate,
          isOnTrack,
          lastComputedAt: new Date(),
        },
        $setOnInsert: { _id: randomUUID() },
      },
      { upsert: true },
    );

    this.logger.log(
      `[Goal] goalId=${goalId} — ${totalLoggedMinutes}min logged, ${consistencyScore}% consistent, onTrack=${String(isOnTrack)}`,
    );
  }

  // ─── COMPUTE_WEEKLY ─────────────────────────────────────────────────────────

  private async handleComputeWeekly(
    payload: AnalyticsJobPayloads[AnalyticsJobName.COMPUTE_WEEKLY],
  ): Promise<void> {
    const { userId, weekStart } = payload;
    const weekStartDate = new Date(`${weekStart}T00:00:00.000Z`);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 6);
    weekEndDate.setUTCHours(23, 59, 59, 999);
    const weekEnd = formatDateString(weekEndDate);

    // ── Daily analytics for the week ──
    const dailyDocs = await this.dailyModel
      .find({ userId, date: { $gte: weekStart, $lte: weekEnd } })
      .lean<
        {
          date: string;
          totalLoggedMinutes: number;
          netFocusMinutes: number;
          deepWorkMinutes: number;
          sessionCount: number;
          completedTaskCount: number;
          timeLeaks: { gapMinutes: number }[];
        }[]
      >();

    if (dailyDocs.length === 0) return;

    const totalLoggedMinutes = dailyDocs.reduce(
      (s, d) => s + d.totalLoggedMinutes,
      0,
    );
    const netFocusMinutes = dailyDocs.reduce(
      (s, d) => s + d.netFocusMinutes,
      0,
    );
    const deepWorkMinutes = dailyDocs.reduce(
      (s, d) => s + d.deepWorkMinutes,
      0,
    );
    const totalSessions = dailyDocs.reduce((s, d) => s + d.sessionCount, 0);
    const totalCompletedTasks = dailyDocs.reduce(
      (s, d) => s + d.completedTaskCount,
      0,
    );
    const avgDailyMinutes = Math.round(totalLoggedMinutes / 7);
    const timeLeaksIdentified = dailyDocs.reduce(
      (s, d) => s + (d.timeLeaks?.length ?? 0),
      0,
    );

    const sortedByMinutes = [...dailyDocs].sort(
      (a, b) => b.totalLoggedMinutes - a.totalLoggedMinutes,
    );
    const bestDay = sortedByMinutes[0]
      ? {
          date: sortedByMinutes[0].date,
          minutes: sortedByMinutes[0].totalLoggedMinutes,
        }
      : null;
    const lastDay = sortedByMinutes[sortedByMinutes.length - 1];
    const worstDay = lastDay
      ? { date: lastDay.date, minutes: lastDay.totalLoggedMinutes }
      : null;

    // ── Goal breakdown via sessions ──
    const sessions = await this.sessionModel
      .find({
        userId,
        status: 'COMPLETED',
        startedAt: { $gte: weekStartDate, $lte: weekEndDate },
      })
      .lean<{ taskId: string; durationMinutes: number | null }[]>();

    const uniqueTaskIds = [...new Set(sessions.map((s) => s.taskId))];
    const taskDocs = await this.taskModel
      .find({ _id: { $in: uniqueTaskIds } })
      .lean<{ _id: string; goalId: string | null }[]>();

    const taskIdToGoalId = new Map<string, string>();
    taskDocs.forEach((t) => {
      if (t.goalId) taskIdToGoalId.set(t._id, t.goalId);
    });

    const goalMinutesMap = new Map<string, number>();
    for (const sess of sessions) {
      const goalId = taskIdToGoalId.get(sess.taskId);
      if (goalId) {
        goalMinutesMap.set(
          goalId,
          (goalMinutesMap.get(goalId) ?? 0) + (sess.durationMinutes ?? 0),
        );
      }
    }

    const uniqueGoalIds = [...goalMinutesMap.keys()];
    const goalDocs = await this.goalModel
      .find({ _id: { $in: uniqueGoalIds } })
      .lean<GoalLean[]>();
    const goalTitleMap = new Map(goalDocs.map((g) => [g._id, g.title]));

    const goalBreakdown = uniqueGoalIds.map((goalId) => ({
      goalId,
      goalTitle: goalTitleMap.get(goalId) ?? 'Unknown',
      minutesLogged: goalMinutesMap.get(goalId) ?? 0,
    }));

    await this.weeklyModel.findOneAndUpdate(
      { userId, weekStart },
      {
        $set: {
          userId,
          weekStart,
          totalLoggedMinutes,
          netFocusMinutes,
          deepWorkMinutes,
          totalSessions,
          totalCompletedTasks,
          avgDailyMinutes,
          bestDay,
          worstDay,
          timeLeaksIdentified,
          goalBreakdown,
          computedAt: new Date(),
        },
        $setOnInsert: { _id: randomUUID() },
      },
      { upsert: true },
    );

    this.logger.log(
      `[Weekly] userId=${userId} week=${weekStart} — ${totalLoggedMinutes}min, ${totalSessions} sessions`,
    );
  }

  // ─── UPDATE_ESTIMATION ──────────────────────────────────────────────────────

  private async handleUpdateEstimation(
    payload: AnalyticsJobPayloads[AnalyticsJobName.UPDATE_ESTIMATION],
  ): Promise<void> {
    const { userId, taskId } = payload;

    const task = await this.taskModel.findById(taskId).lean<{
      estimatedDuration: number;
      actualDuration: number | null;
      efficiencyScore: number | null;
      completedAt: Date | null;
    }>();

    if (!task?.actualDuration || task.efficiencyScore == null) return;

    const newEntry: AccuracyEntry = {
      taskId,
      date: task.completedAt ?? new Date(),
      estimated: task.estimatedDuration,
      actual: task.actualDuration,
      accuracy: task.efficiencyScore,
    };

    const existing = await this.estimationModel
      .findOne({ userId })
      .lean<{ recentAccuracies: AccuracyEntry[] }>();

    const updated: AccuracyEntry[] = [
      newEntry,
      ...(existing?.recentAccuracies ?? []),
    ].slice(0, 30);

    const rollingAverage =
      updated.length > 0
        ? Math.round(
            updated.reduce((s, e) => s + e.accuracy, 0) / updated.length,
          )
        : null;

    let trend: EstimationTrend = 'STABLE';
    if (updated.length >= 6) {
      const mid = Math.floor(updated.length / 2);
      const recentHalf = updated.slice(0, mid);
      const olderHalf = updated.slice(mid);
      const recentAvg =
        recentHalf.reduce((s, e) => s + e.accuracy, 0) / recentHalf.length;
      const olderAvg =
        olderHalf.reduce((s, e) => s + e.accuracy, 0) / olderHalf.length;
      const diff = recentAvg - olderAvg;
      trend = diff > 5 ? 'IMPROVING' : diff < -5 ? 'DECLINING' : 'STABLE';
    }

    await this.estimationModel.findOneAndUpdate(
      { userId },
      {
        $set: {
          userId,
          recentAccuracies: updated,
          rollingAverage,
          trend,
          updatedAt: new Date(),
        },
        $setOnInsert: { _id: randomUUID() },
      },
      { upsert: true },
    );

    this.logger.log(
      `[Estimation] userId=${userId} rolling avg=${String(rollingAverage)} trend=${trend}`,
    );
  }

  // ─── COMPUTE_WEEKLY_ALL (cron) ──────────────────────────────────────────────

  private async handleComputeWeeklyAll(): Promise<void> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);

    const userIds = await this.sessionModel.distinct('userId', {
      startedAt: { $gte: sevenDaysAgo },
    });

    const weekStart = getWeekStart();
    this.logger.log(
      `[WeeklyAll] Fanning out weekly analytics for ${userIds.length} users, week=${weekStart}`,
    );

    for (const userId of userIds) {
      await this.analyticsQueue.add(
        AnalyticsJobName.COMPUTE_WEEKLY,
        { userId, weekStart },
        {
          jobId: `analytics.weekly_${userId}_${weekStart}`,
          removeOnComplete: { count: 30 },
        },
      );
    }
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
