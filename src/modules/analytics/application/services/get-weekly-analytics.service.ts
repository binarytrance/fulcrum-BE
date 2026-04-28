import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  DAILY_ANALYTICS_REPO_PORT,
  type IDailyAnalyticsRepository,
} from '@analytics/domain/ports/daily-analytics-repo.port';
import type { WeeklyAnalytics } from '@analytics/domain/entities/weekly-analytics.entity';
import { WeeklyAnalytics as WeeklyAnalyticsEntity } from '@analytics/domain/entities/weekly-analytics.entity';

interface SessionLean {
  taskId: string;
  durationMs: number | null;
}

interface TaskLean {
  _id: string;
  goalId: string | null;
}

interface GoalLean {
  _id: string;
  title: string;
}

function getWeekEnd(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return end.toISOString().slice(0, 10);
}

function startOfCurrentWeek(): string {
  const d = new Date();
  const day = d.getUTCDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - daysFromMonday);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function minusWeeks(weekStart: string, weeks: number): string {
  const d = new Date(`${weekStart}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - weeks * 7);
  return d.toISOString().slice(0, 10);
}

function weeklyAvgDivisor(weekStart: string): number {
  const start = new Date(`${weekStart}T00:00:00.000Z`);
  const now = new Date();
  const currentWeekStart = startOfCurrentWeek();
  if (weekStart !== currentWeekStart) return 7;

  const todayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const elapsedDays =
    Math.floor((todayUtc.getTime() - start.getTime()) / 86_400_000) + 1;
  return Math.min(Math.max(elapsedDays, 1), 7);
}

@Injectable()
export class GetWeeklyAnalyticsService {
  constructor(
    @Inject(DAILY_ANALYTICS_REPO_PORT)
    private readonly dailyRepo: IDailyAnalyticsRepository,
    @InjectModel('Session')
    private readonly sessionModel: Model<SessionLean>,
    @InjectModel('Task')
    private readonly taskModel: Model<TaskLean>,
    @InjectModel('Goal')
    private readonly goalModel: Model<GoalLean>,
  ) {}

  async getByWeek(userId: string, weekStart: string): Promise<WeeklyAnalytics> {
    const doc = await this.getByWeekOrNull(userId, weekStart);
    if (!doc) {
      throw new NotFoundException(
        `No analytics found for week starting ${weekStart}. Weekly analytics are derived from daily analytics when requested.`,
      );
    }
    return doc;
  }

  async getByWeekOrNull(
    userId: string,
    weekStart: string,
  ): Promise<WeeklyAnalytics | null> {
    const weekEnd = getWeekEnd(weekStart);
    const dailyDocs = await this.dailyRepo.findByUserInRange(
      userId,
      weekStart,
      weekEnd,
    );
    if (dailyDocs.length === 0) return null;

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
    const avgDailyMinutes = Math.round(
      totalLoggedMinutes / weeklyAvgDivisor(weekStart),
    );
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

    const weekStartDate = new Date(`${weekStart}T00:00:00.000Z`);
    const weekEndDate = new Date(`${weekStart}T00:00:00.000Z`);
    weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 6);
    weekEndDate.setUTCHours(23, 59, 59, 999);

    const sessions = await this.sessionModel
      .find({
        userId,
        status: 'COMPLETED',
        startedAt: { $gte: weekStartDate, $lte: weekEndDate },
      })
      .lean<SessionLean[]>();

    const uniqueTaskIds = [...new Set(sessions.map((s) => s.taskId))];
    const taskDocs = await this.taskModel
      .find({ _id: { $in: uniqueTaskIds } })
      .lean<TaskLean[]>();

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
          (goalMinutesMap.get(goalId) ?? 0) +
            Math.round((sess.durationMs ?? 0) / 60_000),
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

    return new WeeklyAnalyticsEntity({
      id: `${userId}_${weekStart}`,
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
    });
  }

  /** Returns the N most recent weekly summaries, newest first. */
  async getRecent(userId: string, limit = 8): Promise<WeeklyAnalytics[]> {
    const currentWeek = startOfCurrentWeek();
    const weeks = Array.from({ length: limit }, (_, i) =>
      minusWeeks(currentWeek, i),
    );
    const docs = await Promise.all(
      weeks.map((weekStart) => this.getByWeekOrNull(userId, weekStart)),
    );
    return docs.filter((doc): doc is WeeklyAnalytics => doc !== null);
  }
}
