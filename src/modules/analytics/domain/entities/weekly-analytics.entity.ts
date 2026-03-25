import type {
  WeeklyAnalyticsFields,
  GoalWeeklyBreakdown,
} from '@analytics/domain/types/analytics.types';

export class WeeklyAnalytics {
  readonly id: string;
  readonly userId: string;
  readonly weekStart: string;

  readonly totalLoggedMinutes: number;
  readonly netFocusMinutes: number;
  readonly deepWorkMinutes: number;
  readonly totalSessions: number;
  readonly totalCompletedTasks: number;
  readonly avgDailyMinutes: number;

  readonly bestDay: { date: string; minutes: number } | null;
  readonly worstDay: { date: string; minutes: number } | null;
  readonly timeLeaksIdentified: number;
  readonly goalBreakdown: GoalWeeklyBreakdown[];
  readonly computedAt: Date;

  constructor(fields: WeeklyAnalyticsFields) {
    this.id = fields.id;
    this.userId = fields.userId;
    this.weekStart = fields.weekStart;
    this.totalLoggedMinutes = fields.totalLoggedMinutes;
    this.netFocusMinutes = fields.netFocusMinutes;
    this.deepWorkMinutes = fields.deepWorkMinutes;
    this.totalSessions = fields.totalSessions;
    this.totalCompletedTasks = fields.totalCompletedTasks;
    this.avgDailyMinutes = fields.avgDailyMinutes;
    this.bestDay = fields.bestDay;
    this.worstDay = fields.worstDay;
    this.timeLeaksIdentified = fields.timeLeaksIdentified;
    this.goalBreakdown = fields.goalBreakdown;
    this.computedAt = fields.computedAt;
  }

  toFields(): WeeklyAnalyticsFields {
    return {
      id: this.id,
      userId: this.userId,
      weekStart: this.weekStart,
      totalLoggedMinutes: this.totalLoggedMinutes,
      netFocusMinutes: this.netFocusMinutes,
      deepWorkMinutes: this.deepWorkMinutes,
      totalSessions: this.totalSessions,
      totalCompletedTasks: this.totalCompletedTasks,
      avgDailyMinutes: this.avgDailyMinutes,
      bestDay: this.bestDay,
      worstDay: this.worstDay,
      timeLeaksIdentified: this.timeLeaksIdentified,
      goalBreakdown: this.goalBreakdown,
      computedAt: this.computedAt,
    };
  }
}
