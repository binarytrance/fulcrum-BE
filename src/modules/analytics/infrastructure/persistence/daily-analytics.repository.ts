import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DailyAnalytics } from '@analytics/domain/entities/daily-analytics.entity';
import type { IDailyAnalyticsRepository } from '@analytics/domain/ports/daily-analytics-repo.port';
import {
  DailyAnalyticsDoc,
  type DailyAnalyticsDocument,
} from '@analytics/infrastructure/persistence/daily-analytics.schema';
import type {
  DailyAnalyticsFields,
  TimeLeak,
} from '@analytics/domain/types/analytics.types';

type DailyLean = {
  _id: string;
  userId: string;
  date: string;
  totalLoggedMinutes: number;
  netFocusMinutes: number;
  deepWorkMinutes: number;
  shallowWorkMinutes: number;
  sessionCount: number;
  totalDistractions: number;
  totalDistractionMinutes: number;
  avgDistractionPerSession: number;
  totalTaskCount: number;
  plannedTaskCount: number;
  unplannedTaskCount: number;
  completedTaskCount: number;
  unplannedPercent: number;
  taskCompletionRate: number;
  avgEfficiencyScore: number | null;
  timeLeaks: TimeLeak[];
  computedAt: Date;
};

function toDomain(doc: DailyLean): DailyAnalytics {
  const fields: DailyAnalyticsFields = {
    id: doc._id,
    userId: doc.userId,
    date: doc.date,
    totalLoggedMinutes: doc.totalLoggedMinutes,
    netFocusMinutes: doc.netFocusMinutes,
    deepWorkMinutes: doc.deepWorkMinutes,
    shallowWorkMinutes: doc.shallowWorkMinutes,
    sessionCount: doc.sessionCount,
    totalDistractions: doc.totalDistractions,
    totalDistractionMinutes: doc.totalDistractionMinutes,
    avgDistractionPerSession: doc.avgDistractionPerSession,
    totalTaskCount: doc.totalTaskCount,
    plannedTaskCount: doc.plannedTaskCount,
    unplannedTaskCount: doc.unplannedTaskCount,
    completedTaskCount: doc.completedTaskCount,
    unplannedPercent: doc.unplannedPercent,
    taskCompletionRate: doc.taskCompletionRate,
    avgEfficiencyScore: doc.avgEfficiencyScore,
    timeLeaks: doc.timeLeaks ?? [],
    computedAt: doc.computedAt,
  };
  return new DailyAnalytics(fields);
}

@Injectable()
export class DailyAnalyticsRepository implements IDailyAnalyticsRepository {
  constructor(
    @InjectModel(DailyAnalyticsDoc.name)
    private readonly model: Model<DailyAnalyticsDocument>,
  ) {}

  async findByUserAndDate(
    userId: string,
    date: string,
  ): Promise<DailyAnalytics | null> {
    const doc = await this.model.findOne({ userId, date }).lean<DailyLean>();
    return doc ? toDomain(doc) : null;
  }

  async findByUserInRange(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<DailyAnalytics[]> {
    const docs = await this.model
      .find({ userId, date: { $gte: startDate, $lte: endDate } })
      .sort({ date: 1 })
      .lean<DailyLean[]>();
    return docs.map(toDomain);
  }
}
