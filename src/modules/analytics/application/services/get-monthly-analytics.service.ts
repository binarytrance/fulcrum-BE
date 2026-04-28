import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  DAILY_ANALYTICS_REPO_PORT,
  type IDailyAnalyticsRepository,
} from '@analytics/domain/ports/daily-analytics-repo.port';
import { MonthlyAnalytics } from '@analytics/domain/entities/monthly-analytics.entity';

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

function monthBounds(month: string): { monthStart: string; monthEnd: string } {
  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;

  const first = new Date(Date.UTC(year, monthIndex, 1));
  const last = new Date(Date.UTC(year, monthIndex + 1, 0));

  return {
    monthStart: first.toISOString().slice(0, 10),
    monthEnd: last.toISOString().slice(0, 10),
  };
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function minusMonths(month: string, delta: number): string {
  const [yearStr, monthStr] = month.split('-');
  const d = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1, 1));
  d.setUTCMonth(d.getUTCMonth() - delta);
  return d.toISOString().slice(0, 7);
}

@Injectable()
export class GetMonthlyAnalyticsService {
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

  async getByMonth(userId: string, month: string): Promise<MonthlyAnalytics> {
    const doc = await this.getByMonthOrNull(userId, month);
    if (!doc) {
      throw new NotFoundException(
        `No analytics found for month ${month}. Monthly analytics are derived from daily analytics when requested.`,
      );
    }
    return doc;
  }

  async getByMonthOrNull(
    userId: string,
    month: string,
  ): Promise<MonthlyAnalytics | null> {
    const { monthStart, monthEnd } = monthBounds(month);
    const dailyDocs = await this.dailyRepo.findByUserInRange(
      userId,
      monthStart,
      monthEnd,
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

    const [y, m] = month.split('-').map(Number);
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const avgDailyMinutes = Math.round(totalLoggedMinutes / daysInMonth);

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

    const monthStartDate = new Date(`${monthStart}T00:00:00.000Z`);
    const monthEndDate = new Date(`${monthEnd}T23:59:59.999Z`);

    const sessions = await this.sessionModel
      .find({
        userId,
        status: 'COMPLETED',
        startedAt: { $gte: monthStartDate, $lte: monthEndDate },
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

    return new MonthlyAnalytics({
      id: `${userId}_${monthStart}`,
      userId,
      monthStart,
      monthEnd,
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

  async getRecent(userId: string, limit = 6): Promise<MonthlyAnalytics[]> {
    const month = currentMonth();
    const months = Array.from({ length: limit }, (_, i) =>
      minusMonths(month, i),
    );
    const docs = await Promise.all(
      months.map((monthKey) => this.getByMonthOrNull(userId, monthKey)),
    );
    return docs.filter((doc): doc is MonthlyAnalytics => doc !== null);
  }
}
