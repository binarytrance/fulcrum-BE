import type { DailyAnalytics } from '@analytics/domain/entities/daily-analytics.entity';

// ── Shared sub-schemas ───────────────────────────────────────────────────────

export const TimeleakSchema = {
  type: 'object',
  properties: {
    startTime: {
      type: 'string',
      example: '10:30',
      description: 'HH:MM — when previous session ended',
    },
    endTime: {
      type: 'string',
      example: '11:15',
      description: 'HH:MM — when next session started',
    },
    gapMinutes: { type: 'integer', example: 45 },
  },
};

export const GoalBreakdownSchema = {
  type: 'object',
  properties: {
    goalId: { type: 'string' },
    goalTitle: { type: 'string', example: 'Learn TypeScript' },
    minutesLogged: { type: 'integer', example: 120 },
  },
};

export const DayMinutesSchema = {
  type: 'object',
  nullable: true,
  properties: {
    date: { type: 'string', example: '2026-05-05', description: 'YYYY-MM-DD' },
    minutes: { type: 'integer', example: 180 },
  },
};

export const AccuracyEntrySchema = {
  type: 'object',
  properties: {
    taskId: { type: 'string' },
    date: { type: 'string', format: 'date-time' },
    estimated: {
      type: 'integer',
      example: 3600000,
      description: 'milliseconds',
    },
    actual: { type: 'integer', example: 3400000, description: 'milliseconds' },
    accuracy: {
      type: 'integer',
      example: 106,
      description: '>100 = finished faster than estimated',
    },
  },
};

// ── DailyAnalytics ───────────────────────────────────────────────────────────

export const DailyAnalyticsSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    userId: { type: 'string' },
    date: { type: 'string', example: '2026-05-07', description: 'YYYY-MM-DD' },
    totalLoggedMinutes: { type: 'number', example: 240 },
    netFocusMinutes: { type: 'number', example: 200 },
    deepWorkMinutes: { type: 'number', example: 120 },
    shallowWorkMinutes: { type: 'number', example: 80 },
    sessionCount: { type: 'integer', example: 3 },
    totalDistractions: { type: 'integer', example: 5 },
    totalDistractionMinutes: { type: 'number', example: 40 },
    avgDistractionPerSession: { type: 'number', example: 1.7 },
    totalTaskCount: { type: 'integer', example: 8 },
    plannedTaskCount: { type: 'integer', example: 5 },
    unplannedTaskCount: { type: 'integer', example: 3 },
    completedTaskCount: { type: 'integer', example: 6 },
    unplannedPercent: { type: 'number', example: 37.5, description: '0–100' },
    taskCompletionRate: { type: 'number', example: 75, description: '0–100' },
    totalHabitCount: { type: 'integer', example: 3 },
    completedHabitCount: { type: 'integer', example: 2 },
    skippedHabitCount: { type: 'integer', example: 1 },
    missedHabitCount: { type: 'integer', example: 0 },
    habitCompletionRate: {
      type: 'number',
      example: 66.7,
      description: '0–100',
    },
    avgEfficiencyScore: { type: 'number', nullable: true, example: 105 },
    timeLeaks: { type: 'array', items: TimeleakSchema },
    computedAt: { type: 'string', format: 'date-time' },
  },
};

// ── WeeklyAnalytics ──────────────────────────────────────────────────────────

export const WeeklyAnalyticsSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    userId: { type: 'string' },
    weekStart: {
      type: 'string',
      example: '2026-05-04',
      description: 'YYYY-MM-DD — Monday of the week',
    },
    totalLoggedMinutes: { type: 'number', example: 960 },
    netFocusMinutes: { type: 'number', example: 840 },
    deepWorkMinutes: { type: 'number', example: 480 },
    totalSessions: { type: 'integer', example: 14 },
    totalCompletedTasks: { type: 'integer', example: 22 },
    avgDailyMinutes: { type: 'number', example: 137 },
    bestDay: DayMinutesSchema,
    worstDay: DayMinutesSchema,
    timeLeaksIdentified: { type: 'integer', example: 3 },
    goalBreakdown: { type: 'array', items: GoalBreakdownSchema },
    computedAt: { type: 'string', format: 'date-time' },
  },
};

// ── MonthlyAnalytics ─────────────────────────────────────────────────────────

export const MonthlyAnalyticsSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    userId: { type: 'string' },
    monthStart: {
      type: 'string',
      example: '2026-05-01',
      description: 'YYYY-MM-01',
    },
    monthEnd: {
      type: 'string',
      example: '2026-05-31',
      description: 'YYYY-MM-DD',
    },
    totalLoggedMinutes: { type: 'number', example: 4200 },
    netFocusMinutes: { type: 'number', example: 3600 },
    deepWorkMinutes: { type: 'number', example: 2000 },
    totalSessions: { type: 'integer', example: 60 },
    totalCompletedTasks: { type: 'integer', example: 90 },
    avgDailyMinutes: { type: 'number', example: 140 },
    bestDay: DayMinutesSchema,
    worstDay: DayMinutesSchema,
    timeLeaksIdentified: { type: 'integer', example: 12 },
    goalBreakdown: { type: 'array', items: GoalBreakdownSchema },
    computedAt: { type: 'string', format: 'date-time' },
  },
};

// ── GoalAnalytics ────────────────────────────────────────────────────────────

export const GoalAnalyticsSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    goalId: { type: 'string' },
    userId: { type: 'string' },
    goalTitle: { type: 'string', example: 'Learn TypeScript' },
    totalLoggedMinutes: { type: 'number', example: 840 },
    taskCount: { type: 'integer', example: 12 },
    completedTaskCount: { type: 'integer', example: 7 },
    completionPercent: { type: 'number', example: 58, description: '0–100' },
    avgEfficiencyScore: { type: 'number', nullable: true, example: 102 },
    consistencyScore: {
      type: 'number',
      example: 75,
      description: '0–100 — % of last 12 weeks with ≥1 session',
    },
    weeklyAvgMinutes: { type: 'number', example: 70 },
    projectedCompletionDate: {
      type: 'string',
      format: 'date-time',
      nullable: true,
      example: '2026-11-15T00:00:00.000Z',
    },
    isOnTrack: { type: 'boolean', nullable: true, example: true },
    lastComputedAt: { type: 'string', format: 'date-time' },
  },
};

// ── EstimationProfile ────────────────────────────────────────────────────────

export const EstimationProfileSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    userId: { type: 'string' },
    recentAccuracies: {
      type: 'array',
      items: AccuracyEntrySchema,
      description: 'Last 30 completions, newest first',
    },
    rollingAverage: { type: 'number', nullable: true, example: 103 },
    trend: {
      type: 'string',
      enum: ['IMPROVING', 'DECLINING', 'STABLE'],
      nullable: true,
      example: 'STABLE',
    },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

// ── Dashboard (legacy) ───────────────────────────────────────────────────────

export const DashboardResultSchema = {
  type: 'object',
  properties: {
    today: {
      ...DailyAnalyticsSchema,
      nullable: true,
      description: 'null if no session/task logged today yet',
    },
    thisWeek: {
      ...WeeklyAnalyticsSchema,
      nullable: true,
      description: 'null if no activity this week yet',
    },
    goals: { type: 'array', items: GoalAnalyticsSchema },
    estimation: {
      ...EstimationProfileSchema,
      nullable: true,
      description: 'null if no tasks completed yet',
    },
  },
};

// ── Grouped Daily (new) ──────────────────────────────────────────────────────

export const GroupedDailyAnalyticsSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    userId: { type: 'string' },
    date: { type: 'string', example: '2026-05-07', description: 'YYYY-MM-DD' },
    computedAt: { type: 'string', format: 'date-time' },
    focusSessions: {
      type: 'object',
      properties: {
        sessionCount: { type: 'integer', example: 3 },
        totalLoggedMinutes: { type: 'number', example: 240 },
        netFocusMinutes: { type: 'number', example: 200 },
        deepWorkMinutes: { type: 'number', example: 120 },
        shallowWorkMinutes: { type: 'number', example: 80 },
        totalDistractions: { type: 'integer', example: 5 },
        totalDistractionMinutes: { type: 'number', example: 40 },
        avgDistractionPerSession: { type: 'number', example: 1.7 },
        avgEfficiencyScore: { type: 'number', nullable: true, example: 105 },
        timeLeaks: { type: 'array', items: TimeleakSchema },
      },
    },
    tasks: {
      type: 'object',
      properties: {
        totalTaskCount: { type: 'integer', example: 8 },
        plannedTaskCount: { type: 'integer', example: 5 },
        unplannedTaskCount: { type: 'integer', example: 3 },
        completedTaskCount: { type: 'integer', example: 6 },
        unplannedPercent: {
          type: 'number',
          example: 37.5,
          description: '0–100',
        },
        taskCompletionRate: {
          type: 'number',
          example: 75,
          description: '0–100',
        },
      },
    },
    habits: {
      type: 'object',
      properties: {
        totalHabitCount: { type: 'integer', example: 3 },
        completedHabitCount: { type: 'integer', example: 2 },
        skippedHabitCount: { type: 'integer', example: 1 },
        missedHabitCount: { type: 'integer', example: 0 },
        habitCompletionRate: {
          type: 'number',
          example: 66.7,
          description: '0–100',
        },
      },
    },
    appStreak: {
      type: 'object',
      properties: {
        current: {
          type: 'integer',
          example: 7,
          description: 'Consecutive active days. 0 if streak is broken.',
        },
        longest: {
          type: 'integer',
          example: 21,
          description: 'All-time longest streak.',
        },
        lastActiveDate: {
          type: 'string',
          format: 'date',
          example: '2026-05-10',
          nullable: true,
        },
      },
    },
  },
};

// ── App Streak ───────────────────────────────────────────────────────────────

export interface AppStreak {
  current: number;
  longest: number;
  lastActiveDate: string | null;
}

// ── Mapper ───────────────────────────────────────────────────────────────────

export function toGroupedDailyResponse(
  analytics: DailyAnalytics,
  appStreak: AppStreak,
) {
  return {
    id: analytics.id,
    userId: analytics.userId,
    date: analytics.date,
    computedAt: analytics.computedAt,
    focusSessions: {
      sessionCount: analytics.sessionCount,
      totalLoggedMinutes: analytics.totalLoggedMinutes,
      netFocusMinutes: analytics.netFocusMinutes,
      deepWorkMinutes: analytics.deepWorkMinutes,
      shallowWorkMinutes: analytics.shallowWorkMinutes,
      totalDistractions: analytics.totalDistractions,
      totalDistractionMinutes: analytics.totalDistractionMinutes,
      avgDistractionPerSession: analytics.avgDistractionPerSession,
      avgEfficiencyScore: analytics.avgEfficiencyScore,
      timeLeaks: analytics.timeLeaks,
    },
    tasks: {
      totalTaskCount: analytics.totalTaskCount,
      plannedTaskCount: analytics.plannedTaskCount,
      unplannedTaskCount: analytics.unplannedTaskCount,
      completedTaskCount: analytics.completedTaskCount,
      unplannedPercent: analytics.unplannedPercent,
      taskCompletionRate: analytics.taskCompletionRate,
    },
    habits: {
      totalHabitCount: analytics.totalHabitCount,
      completedHabitCount: analytics.completedHabitCount,
      skippedHabitCount: analytics.skippedHabitCount,
      missedHabitCount: analytics.missedHabitCount,
      habitCompletionRate: analytics.habitCompletionRate,
    },
    appStreak,
  };
}
