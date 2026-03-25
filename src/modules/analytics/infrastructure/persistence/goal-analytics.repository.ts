import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GoalAnalytics } from '@analytics/domain/entities/goal-analytics.entity';
import type { IGoalAnalyticsRepository } from '@analytics/domain/ports/goal-analytics-repo.port';
import {
  GoalAnalyticsDoc,
  type GoalAnalyticsDocument,
} from '@analytics/infrastructure/persistence/goal-analytics.schema';
import type { GoalAnalyticsFields } from '@analytics/domain/types/analytics.types';

type GoalLean = {
  _id: string;
  goalId: string;
  userId: string;
  goalTitle: string;
  totalLoggedMinutes: number;
  taskCount: number;
  completedTaskCount: number;
  completionPercent: number;
  avgEfficiencyScore: number | null;
  consistencyScore: number;
  weeklyAvgMinutes: number;
  projectedCompletionDate: Date | null;
  isOnTrack: boolean | null;
  lastComputedAt: Date;
};

function toDomain(doc: GoalLean): GoalAnalytics {
  const fields: GoalAnalyticsFields = {
    id: doc._id,
    goalId: doc.goalId,
    userId: doc.userId,
    goalTitle: doc.goalTitle,
    totalLoggedMinutes: doc.totalLoggedMinutes,
    taskCount: doc.taskCount,
    completedTaskCount: doc.completedTaskCount,
    completionPercent: doc.completionPercent,
    avgEfficiencyScore: doc.avgEfficiencyScore,
    consistencyScore: doc.consistencyScore,
    weeklyAvgMinutes: doc.weeklyAvgMinutes,
    projectedCompletionDate: doc.projectedCompletionDate,
    isOnTrack: doc.isOnTrack,
    lastComputedAt: doc.lastComputedAt,
  };
  return new GoalAnalytics(fields);
}

@Injectable()
export class GoalAnalyticsRepository implements IGoalAnalyticsRepository {
  constructor(
    @InjectModel(GoalAnalyticsDoc.name)
    private readonly model: Model<GoalAnalyticsDocument>,
  ) {}

  async findByGoalId(goalId: string): Promise<GoalAnalytics | null> {
    const doc = await this.model.findOne({ goalId }).lean<GoalLean>();
    return doc ? toDomain(doc) : null;
  }

  async findByUserId(userId: string): Promise<GoalAnalytics[]> {
    const docs = await this.model.find({ userId }).lean<GoalLean[]>();
    return docs.map(toDomain);
  }
}
