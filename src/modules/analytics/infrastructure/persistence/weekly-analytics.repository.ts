import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WeeklyAnalytics } from '@analytics/domain/entities/weekly-analytics.entity';
import type { IWeeklyAnalyticsRepository } from '@analytics/domain/ports/weekly-analytics-repo.port';
import {
  WeeklyAnalyticsDoc,
  type WeeklyAnalyticsDocument,
} from '@analytics/infrastructure/persistence/weekly-analytics.schema';
import type {
  WeeklyAnalyticsFields,
  GoalWeeklyBreakdown,
} from '@analytics/domain/types/analytics.types';

type WeeklyLean = {
  _id: string;
  userId: string;
  weekStart: string;
  totalLoggedMinutes: number;
  netFocusMinutes: number;
  deepWorkMinutes: number;
  totalSessions: number;
  totalCompletedTasks: number;
  avgDailyMinutes: number;
  bestDay: { date: string; minutes: number } | null;
  worstDay: { date: string; minutes: number } | null;
  timeLeaksIdentified: number;
  goalBreakdown: GoalWeeklyBreakdown[];
  computedAt: Date;
};

function toDomain(doc: WeeklyLean): WeeklyAnalytics {
  const fields: WeeklyAnalyticsFields = {
    id: doc._id,
    userId: doc.userId,
    weekStart: doc.weekStart,
    totalLoggedMinutes: doc.totalLoggedMinutes,
    netFocusMinutes: doc.netFocusMinutes,
    deepWorkMinutes: doc.deepWorkMinutes,
    totalSessions: doc.totalSessions,
    totalCompletedTasks: doc.totalCompletedTasks,
    avgDailyMinutes: doc.avgDailyMinutes,
    bestDay: doc.bestDay,
    worstDay: doc.worstDay,
    timeLeaksIdentified: doc.timeLeaksIdentified,
    goalBreakdown: doc.goalBreakdown ?? [],
    computedAt: doc.computedAt,
  };
  return new WeeklyAnalytics(fields);
}

@Injectable()
export class WeeklyAnalyticsRepository implements IWeeklyAnalyticsRepository {
  constructor(
    @InjectModel(WeeklyAnalyticsDoc.name)
    private readonly model: Model<WeeklyAnalyticsDocument>,
  ) {}

  async findByUserAndWeek(
    userId: string,
    weekStart: string,
  ): Promise<WeeklyAnalytics | null> {
    const doc = await this.model
      .findOne({ userId, weekStart })
      .lean<WeeklyLean>();
    return doc ? toDomain(doc) : null;
  }

  async findRecentByUser(
    userId: string,
    limit: number,
  ): Promise<WeeklyAnalytics[]> {
    const docs = await this.model
      .find({ userId })
      .sort({ weekStart: -1 })
      .limit(limit)
      .lean<WeeklyLean[]>();
    return docs.map(toDomain);
  }
}
