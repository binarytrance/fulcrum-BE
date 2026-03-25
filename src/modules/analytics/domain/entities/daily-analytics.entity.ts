import type {
  DailyAnalyticsFields,
  TimeLeak,
} from '@analytics/domain/types/analytics.types';

export class DailyAnalytics {
  readonly id: string;
  readonly userId: string;
  readonly date: string;

  readonly totalLoggedMinutes: number;
  readonly netFocusMinutes: number;
  readonly deepWorkMinutes: number;
  readonly shallowWorkMinutes: number;

  readonly sessionCount: number;
  readonly totalDistractions: number;
  readonly totalDistractionMinutes: number;
  readonly avgDistractionPerSession: number;

  readonly totalTaskCount: number;
  readonly plannedTaskCount: number;
  readonly unplannedTaskCount: number;
  readonly completedTaskCount: number;
  readonly unplannedPercent: number;
  readonly taskCompletionRate: number;

  readonly avgEfficiencyScore: number | null;
  readonly timeLeaks: TimeLeak[];
  readonly computedAt: Date;

  constructor(fields: DailyAnalyticsFields) {
    this.id = fields.id;
    this.userId = fields.userId;
    this.date = fields.date;
    this.totalLoggedMinutes = fields.totalLoggedMinutes;
    this.netFocusMinutes = fields.netFocusMinutes;
    this.deepWorkMinutes = fields.deepWorkMinutes;
    this.shallowWorkMinutes = fields.shallowWorkMinutes;
    this.sessionCount = fields.sessionCount;
    this.totalDistractions = fields.totalDistractions;
    this.totalDistractionMinutes = fields.totalDistractionMinutes;
    this.avgDistractionPerSession = fields.avgDistractionPerSession;
    this.totalTaskCount = fields.totalTaskCount;
    this.plannedTaskCount = fields.plannedTaskCount;
    this.unplannedTaskCount = fields.unplannedTaskCount;
    this.completedTaskCount = fields.completedTaskCount;
    this.unplannedPercent = fields.unplannedPercent;
    this.taskCompletionRate = fields.taskCompletionRate;
    this.avgEfficiencyScore = fields.avgEfficiencyScore;
    this.timeLeaks = fields.timeLeaks;
    this.computedAt = fields.computedAt;
  }

  toFields(): DailyAnalyticsFields {
    return {
      id: this.id,
      userId: this.userId,
      date: this.date,
      totalLoggedMinutes: this.totalLoggedMinutes,
      netFocusMinutes: this.netFocusMinutes,
      deepWorkMinutes: this.deepWorkMinutes,
      shallowWorkMinutes: this.shallowWorkMinutes,
      sessionCount: this.sessionCount,
      totalDistractions: this.totalDistractions,
      totalDistractionMinutes: this.totalDistractionMinutes,
      avgDistractionPerSession: this.avgDistractionPerSession,
      totalTaskCount: this.totalTaskCount,
      plannedTaskCount: this.plannedTaskCount,
      unplannedTaskCount: this.unplannedTaskCount,
      completedTaskCount: this.completedTaskCount,
      unplannedPercent: this.unplannedPercent,
      taskCompletionRate: this.taskCompletionRate,
      avgEfficiencyScore: this.avgEfficiencyScore,
      timeLeaks: this.timeLeaks,
      computedAt: this.computedAt,
    };
  }
}
