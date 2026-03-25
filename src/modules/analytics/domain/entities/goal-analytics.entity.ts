import type { GoalAnalyticsFields } from '@analytics/domain/types/analytics.types';

export class GoalAnalytics {
  readonly id: string;
  readonly goalId: string;
  readonly userId: string;
  readonly goalTitle: string;

  readonly totalLoggedMinutes: number;
  readonly taskCount: number;
  readonly completedTaskCount: number;
  readonly completionPercent: number;
  readonly avgEfficiencyScore: number | null;
  readonly consistencyScore: number;
  readonly weeklyAvgMinutes: number;
  readonly projectedCompletionDate: Date | null;
  readonly isOnTrack: boolean | null;
  readonly lastComputedAt: Date;

  constructor(fields: GoalAnalyticsFields) {
    this.id = fields.id;
    this.goalId = fields.goalId;
    this.userId = fields.userId;
    this.goalTitle = fields.goalTitle;
    this.totalLoggedMinutes = fields.totalLoggedMinutes;
    this.taskCount = fields.taskCount;
    this.completedTaskCount = fields.completedTaskCount;
    this.completionPercent = fields.completionPercent;
    this.avgEfficiencyScore = fields.avgEfficiencyScore;
    this.consistencyScore = fields.consistencyScore;
    this.weeklyAvgMinutes = fields.weeklyAvgMinutes;
    this.projectedCompletionDate = fields.projectedCompletionDate;
    this.isOnTrack = fields.isOnTrack;
    this.lastComputedAt = fields.lastComputedAt;
  }

  toFields(): GoalAnalyticsFields {
    return {
      id: this.id,
      goalId: this.goalId,
      userId: this.userId,
      goalTitle: this.goalTitle,
      totalLoggedMinutes: this.totalLoggedMinutes,
      taskCount: this.taskCount,
      completedTaskCount: this.completedTaskCount,
      completionPercent: this.completionPercent,
      avgEfficiencyScore: this.avgEfficiencyScore,
      consistencyScore: this.consistencyScore,
      weeklyAvgMinutes: this.weeklyAvgMinutes,
      projectedCompletionDate: this.projectedCompletionDate,
      isOnTrack: this.isOnTrack,
      lastComputedAt: this.lastComputedAt,
    };
  }
}
